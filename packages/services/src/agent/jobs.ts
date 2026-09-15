import {
	getProviderAccountId,
	parseProviderAccountId,
	withProviderAccount,
} from "./accountScope.js";
import type { ProviderAccountId } from "@oneglanse/types";
import { randomUUID } from "node:crypto";
import { toErrorMessage } from "@oneglanse/errors";
import type {
	ExecutionSurface,
	MobileProvider,
	Provider,
	UserPrompt,
} from "@oneglanse/types";
import {
	MOBILE_PROVIDER_LIST,
	PROVIDER_LIST,
	buildRunTargetId,
} from "@oneglanse/types";
import { buildExposureTerms } from "@oneglanse/utils";
import { listDeviceConnections } from "../device/index.js";
import { env } from "../env.js";
import { fetchUserPromptsForWorkspace } from "../prompt/index.js";
import { getWorkspaceById } from "../workspace/index.js";
import {
	getAuthProviderForRuntimeProvider,
	getMissingRuntimeProviders,
	readAuthenticatedRuntimeProviders,
} from "./auth.js";
import { updateProviderProgress } from "./progress.js";
import { getProviderQueue } from "./queue.js";
import { redis, waitForRedis } from "./redis.js";

const AGENT_PROGRESS_TTL_SECONDS = 24 * 60 * 60;
const PROVIDER_STOP_CHANNEL = "oneglanse:agent:provider-stop";

export type ProviderRunTarget = {
	provider: Provider;
	surface: ExecutionSurface;
};

export type ProviderJobPayload = ProviderRunTarget & {
	jobGroupId: string;
	accountId?: ProviderAccountId;
	runProviders?: Provider[];
	prompts: UserPrompt[];
	user_id: string;
	workspace_id: string;
	created_at?: string;
	exposureTerms: string[];
};

export type SubmitAgentJobResult =
	| { status: "queued"; jobGroupId: string }
	| { status: "empty" }
	| { status: "no-providers"; disconnectedProviders: Provider[] };

export function buildProviderJobId(
	jobGroupId: string,
	provider: Provider,
	surface: ExecutionSurface = "web",
): string {
	return `${jobGroupId}__${surface}__${provider}`;
}

export function buildProviderCancelKey(
	jobGroupId: string,
	provider: Provider,
	surface: ExecutionSurface = "web",
): string {
	return `job:${jobGroupId}:cancel:${surface}:${provider}`;
}

async function enqueueProviderJob(payload: ProviderJobPayload): Promise<void> {
	const queue = getProviderQueue(
		payload.provider,
		payload.surface,
		payload.accountId ?? "default",
	);
	try {
		await queue.waitUntilReady();
		const jobId = buildProviderJobId(
			payload.jobGroupId,
			payload.provider,
			payload.surface,
		);
		if (await queue.getJob(jobId)) return;
		await queue.add("run-provider", payload, { jobId });
	} catch (error) {
		throw new Error(
			`failed to enqueue ${payload.surface}:${payload.provider}: ${toErrorMessage(error)}`,
		);
	}
}

export async function enqueueProviderJobs(args: {
	jobGroupId: string;
	prompts: UserPrompt[];
	userId: string;
	workspaceId: string;
	targets: ProviderRunTarget[];
	exposureTerms: string[];
}): Promise<ProviderRunTarget[]> {
	const results = await Promise.allSettled(
		args.targets.map(async (target) => {
			await enqueueProviderJob({
				...target,
				accountId: getProviderAccountId(),
				jobGroupId: args.jobGroupId,
				runProviders: [target.provider],
				prompts: args.prompts,
				user_id: args.userId,
				workspace_id: args.workspaceId,
				exposureTerms: args.exposureTerms,
			});
			return target;
		}),
	);

	return results.flatMap((result, index) => {
		if (result.status === "fulfilled") return [];
		const target = args.targets[index];
		if (!target) return [];
		console.error(
			`[agent] failed to enqueue ${buildRunTargetId(target.surface, target.provider)}: ${toErrorMessage(result.reason)}`,
		);
		return [target];
	});
}

async function markTargetsFailed(args: {
	jobGroupId: string;
	targets: ProviderRunTarget[];
}): Promise<void> {
	await Promise.all(
		args.targets.map((target) =>
			updateProviderProgress({
				jobGroupId: args.jobGroupId,
				provider: target.provider,
				surface: target.surface,
				status: "failed",
				resultCount: 0,
			}),
		),
	);
}

type SubmitAgentJobArgs = {
	accountId?: ProviderAccountId;
	workspaceId: string;
	userId: string;
	promptIds?: string[];
	providers?: Provider[];
	surfaces?: ExecutionSurface[];
	runCount?: number;
};
export async function submitAgentJobGroup(
	args: SubmitAgentJobArgs,
): Promise<SubmitAgentJobResult> {
	return withProviderAccount(args.accountId ?? "default", () =>
		submitScopedAgentJobGroup(args),
	);
}
async function submitScopedAgentJobGroup(
	args: SubmitAgentJobArgs,
): Promise<SubmitAgentJobResult> {
	if (
		getProviderAccountId() !== "default" &&
		args.surfaces?.some((s) => s !== "web")
	) {
		throw new Error("Browser accounts support web runs only");
	}
	const { workspaceId, userId, promptIds } = args;
	const surfaces = [...new Set(args.surfaces ?? ["web"])] as ExecutionSurface[];

	let prompts: UserPrompt[];
	let allowedProviders: Provider[];
	let exposureTerms: string[];
	try {
		const [loadedPrompts, workspace] = await Promise.all([
			fetchUserPromptsForWorkspace({ workspaceId }),
			getWorkspaceById({ workspaceId }),
		]);
		const effectivePromptIds = promptIds ?? workspace.selectedPromptIds;
		prompts =
			effectivePromptIds === null
				? loadedPrompts
				: [...new Set(effectivePromptIds)]
						.map((id) => loadedPrompts.find((prompt) => prompt.id === id))
						.filter((prompt): prompt is UserPrompt => Boolean(prompt));
		allowedProviders = workspace.enabledProviders
			? PROVIDER_LIST.filter((provider) =>
					workspace.enabledProviders?.includes(
						getAuthProviderForRuntimeProvider(provider),
					),
				)
			: [...PROVIDER_LIST];
		exposureTerms = buildExposureTerms({
			brandName: workspace.name,
			domain: workspace.domain,
			aliases: workspace.exposureTerms,
		});
	} catch (error) {
		throw new Error(
			`failed to load workspace prompts: ${toErrorMessage(error)}`,
		);
	}

	if (args.providers !== undefined) {
		allowedProviders = allowedProviders.filter((provider) =>
			args.providers?.includes(provider),
		);
	}

	if (prompts.length === 0) return { status: "empty" };

	const runCount = Math.min(50, Math.max(1, Math.trunc(args.runCount ?? 1)));
	prompts = Array.from({ length: runCount }, () => prompts).flat();

	const webProviders = surfaces.includes("web")
		? await readAuthenticatedRuntimeProviders(allowedProviders)
		: [];
	const androidEnabled =
		env.ANDROID_DEVICE_AUTOMATION_ENABLED === "true" ||
		env.ANDROID_DEVICE_AUTOMATION_ENABLED === "1";
	const devices =
		surfaces.includes("android_app") && androidEnabled
			? await listDeviceConnections(workspaceId)
			: [];
	const mobileProviders = allowedProviders.filter(
		(provider): provider is MobileProvider =>
			(MOBILE_PROVIDER_LIST as readonly Provider[]).includes(provider) &&
			devices.some(
				(device) =>
					device.enabled &&
					(device.supportedProviders as readonly Provider[]).includes(provider),
			),
	);
	const targets: ProviderRunTarget[] = [
		...webProviders.map((provider) => ({
			provider,
			surface: "web" as const,
		})),
		...mobileProviders.map((provider) => ({
			provider,
			surface: "android_app" as const,
		})),
	];

	if (targets.length === 0) {
		const disconnectedProviders = surfaces.includes("web")
			? await getMissingRuntimeProviders(allowedProviders)
			: allowedProviders;
		return { status: "no-providers", disconnectedProviders };
	}

	const jobGroupId = randomUUID();
	await waitForRedis();
	await redis.set(
		`job:${jobGroupId}:account`,
		getProviderAccountId(),
		"EX",
		AGENT_PROGRESS_TTL_SECONDS,
	);
	const targetIds = targets.map((target) =>
		buildRunTargetId(target.surface, target.provider),
	);
	await redis.set(
		`job:${jobGroupId}:result`,
		JSON.stringify({
			status: "pending",
			accountId: getProviderAccountId(),
			updateId: 0,
			providers: Object.fromEntries(targetIds.map((id) => [id, "pending"])),
			results: Object.fromEntries(targetIds.map((id) => [id, 0])),
			stats: {
				totalPrompts: prompts.length,
				expectedResponses: prompts.length * targets.length,
				actualResponses: 0,
			},
		}),
		"EX",
		AGENT_PROGRESS_TTL_SECONDS,
	);

	void enqueueProviderJobs({
		jobGroupId,
		prompts,
		userId,
		workspaceId,
		targets,
		exposureTerms,
	})
		.then(async (failedTargets) => {
			if (failedTargets.length > 0) {
				await markTargetsFailed({ jobGroupId, targets: failedTargets });
			}
		})
		.catch(async (error) => {
			console.error(
				`[agent] failed to queue job group ${jobGroupId}: ${toErrorMessage(error)}`,
			);
			await markTargetsFailed({ jobGroupId, targets });
		});

	return { status: "queued", jobGroupId };
}

export async function cancelProviderRun(args: {
	jobGroupId: string;
	provider: Provider;
	surface?: ExecutionSurface;
}): Promise<{ accepted: boolean }> {
	const { jobGroupId, provider, surface = "web" } = args;
	await waitForRedis();
	const accountId = parseProviderAccountId(
		(await redis.get(`job:${jobGroupId}:account`)) ?? "default",
	);
	const queue = getProviderQueue(provider, surface, accountId);
	const job = await queue.getJob(
		buildProviderJobId(jobGroupId, provider, surface),
	);

	await waitForRedis();
	await redis.set(
		buildProviderCancelKey(jobGroupId, provider, surface),
		"1",
		"EX",
		AGENT_PROGRESS_TTL_SECONDS,
	);
	if (job) {
		const state = await job.getState();
		if (state === "waiting" || state === "delayed" || state === "prioritized") {
			await job.remove();
			await updateProviderProgress({
				jobGroupId,
				provider,
				surface,
				status: "stopped",
				resultCount: 0,
			});
			return { accepted: true };
		}
	}
	await redis.publish(
		PROVIDER_STOP_CHANNEL,
		JSON.stringify({ jobGroupId, provider, surface }),
	);
	return { accepted: true };
}
