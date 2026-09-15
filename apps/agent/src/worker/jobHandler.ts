import { getProviderAccountId } from "@oneglanse/services";
import type { ProviderAccountId } from "@oneglanse/types";
import {
	ValidationError,
	classifyError,
	toErrorMessage,
} from "@oneglanse/errors";
import {
	buildProviderCancelKey,
	buildProviderJobId,
	hasRuntimeProviderAuth,
	getAuthProviderForRuntimeProvider,
	redis,
	storePromptResponses,
	updateDeviceHealth,
	updateProviderProgress,
	writeProviderAuthStatus,
} from "@oneglanse/services";
import type {
	AgentResult,
	AskPromptResult,
	AuthProvider,
	ExecutionSurface,
	MobileProvider,
	ModelResult,
	PromptPayload,
	Provider,
} from "@oneglanse/types";
import {
	AUTH_PROVIDER_LIST,
	MOBILE_PROVIDER_LIST,
	PROVIDER_LIST,
} from "@oneglanse/types";
import { createProviderLogger } from "@oneglanse/utils";
import type { Job } from "bullmq";
import { ProviderActionRequiredError } from "../core/providerActionRequired.js";
import { agentHandler } from "../core/agentHandler.js";
import { createAgent } from "../core/createAgent.js";
import { PROVIDER_CONFIGS } from "../core/providers/index.js";
import { env } from "../env.js";
import { StopProviderRunError } from "../lib/browser/proxy/runner.js";
import { acquireDevice } from "../mobile/devicePool.js";
import { runMobileProviderBatch } from "../mobile/runner.js";
import { runAnalysisInBackground } from "./analysis.js";

type ProviderStatus =
	| "pending"
	| "running"
	| "completed"
	| "failed"
	| "stopped";
export type ProviderJobData = {
	accountId?: ProviderAccountId;
	jobGroupId: string;
	provider: Provider;
	runProviders?: Provider[];
	prompts: PromptPayload["prompts"];
	user_id: string;
	workspace_id: string;
	created_at?: string;
	surface?: ExecutionSurface;
	exposureTerms?: string[];
};

const PROGRESS_TTL_SECONDS = 24 * 60 * 60;
const activeStops = new Map<string, () => Promise<void>>();

function progressSeed(
	providers: Provider[],
	count: number,
	surface: ExecutionSurface,
) {
	const keys = providers.map((provider) => `${surface}:${provider}`);
	return JSON.stringify({
		status: "pending",
		updateId: 0,
		providers: Object.fromEntries(keys.map((key) => [key, "pending"])),
		results: Object.fromEntries(keys.map((key) => [key, 0])),
		stats: {
			totalPrompts: count,
			expectedResponses: count * providers.length,
			actualResponses: 0,
		},
	});
}

function ownedProviders(provider: Provider, values?: Provider[]): Provider[] {
	const providers = (values?.length ? values : [provider]).filter(
		(value, index, all): value is Provider =>
			PROVIDER_LIST.includes(value) && all.indexOf(value) === index,
	);
	return providers.length ? providers : [provider];
}

function emptyModelResults(): ModelResult {
	return Object.fromEntries(
		PROVIDER_LIST.map((provider) => [
			provider,
			{ status: "rejected", data: [] },
		]),
	) as unknown as ModelResult;
}

async function setProgress(args: {
	jobGroupId: string;
	providers: Provider[];
	surface: ExecutionSurface;
	status: ProviderStatus;
	resultCount?: number | null;
	error?: string;
}) {
	await Promise.all(
		args.providers.map((provider) =>
			updateProviderProgress({
				jobGroupId: args.jobGroupId,
				provider,
				surface: args.surface,
				status: args.status,
				resultCount: args.resultCount,
				error: args.error,
			}),
		),
	);
}

export async function stopActiveProviderRun(args: {
	jobGroupId: string;
	provider: Provider;
	surface?: ExecutionSurface;
}): Promise<boolean> {
	const stop = activeStops.get(
		buildProviderJobId(args.jobGroupId, args.provider, args.surface ?? "web"),
	);
	if (!stop) return false;
	await stop();
	return true;
}

function failedMobileResults(
	data: ProviderJobData,
	reason: string,
): AskPromptResult[] {
	return data.prompts.map((prompt) => ({
		userId: data.user_id,
		workspaceId: data.workspace_id,
		promptId: prompt.id,
		prompt: prompt.prompt,
		response: "",
		sources: [],
		collection: {
			runId: data.jobGroupId,
			surface: "android_app",
			exposureEvaluated: false,
			exposureTerms: data.exposureTerms ?? [],
			exposureMatches: [],
			status: "failed",
			failureReason: reason,
		},
	}));
}

async function persist(
	data: ProviderJobData,
	provider: Provider,
	results: AskPromptResult[],
	executionTime: string,
) {
	const modelResults = emptyModelResults();
	modelResults[provider] = { status: "fulfilled", data: results };
	await storePromptResponses({
		accountId: getProviderAccountId(),
		results: modelResults,
		userId: data.user_id,
		workspaceId: data.workspace_id,
		promptRunAt: executionTime,
		runId: data.jobGroupId,
		exposureTerms: data.exposureTerms,
	});
}

async function runMobile(
	data: ProviderJobData,
	provider: MobileProvider,
	signal: AbortSignal,
	executionTime: string,
	setCleanup: (cleanup: (() => Promise<void>) | null) => void,
) {
	const surface = "android_app" as const;
	await setProgress({
		jobGroupId: data.jobGroupId,
		providers: [provider],
		surface,
		status: "running",
		resultCount: 0,
	});
	if (!env.ANDROID_DEVICE_AUTOMATION_ENABLED) {
		await persist(
			data,
			provider,
			failedMobileResults(data, "android_automation_disabled"),
			executionTime,
		);
		await setProgress({
			jobGroupId: data.jobGroupId,
			providers: [provider],
			surface,
			status: "failed",
			resultCount: 0,
		});
		return true;
	}
	if (
		(await redis.get(
			buildProviderCancelKey(data.jobGroupId, provider, surface),
		)) === "1"
	) {
		throw new StopProviderRunError(provider);
	}
	let lease = await acquireDevice({
		workspaceId: data.workspace_id,
		provider,
		leaseOwner: buildProviderJobId(data.jobGroupId, provider, surface),
		signal,
	});
	if (!lease) {
		await persist(
			data,
			provider,
			failedMobileResults(data, "no_device"),
			executionTime,
		);
		await setProgress({
			jobGroupId: data.jobGroupId,
			providers: [provider],
			surface,
			status: "failed",
			resultCount: 0,
		});
		return true;
	}
	const plog = createProviderLogger(provider);

	const excludedDeviceIds: string[] = [];
	let lastFailure = "device_connection_failed";
	for (let deviceAttempt = 0; deviceAttempt < 2 && lease; deviceAttempt += 1) {
		let healthAfterRun: "ready" | "offline" | "login_required" = "offline";
		let batchStarted = false;
		try {
			plog.log(
				`[run:${data.jobGroupId}][surface:android_app][device:${lease.device.id}] started`,
			);
			const results = await runMobileProviderBatch({
				device: lease.device,
				secret: lease.secret,
				provider,
				payload: {
					user_id: data.user_id,
					workspace_id: data.workspace_id,
					prompts: data.prompts,
					created_at: executionTime,
				},
				runId: data.jobGroupId,
				exposureTerms: data.exposureTerms ?? [],
				signal,
				onProgress: (count) =>
					updateProviderProgress({
						jobGroupId: data.jobGroupId,
						provider,
						surface,
						status: "running",
						resultCount: count,
					}),
				onSessionReady: (close) => setCleanup(close),
				onBatchStarted: () => {
					batchStarted = true;
				},
			});
			await persist(data, provider, results, executionTime);
			const successCount = results.filter(
				(result) => result.collection?.status !== "failed",
			).length;
			if (successCount)
				runAnalysisInBackground({
					workspaceId: data.workspace_id,
					userId: data.user_id,
					provider,
					jobGroupId: data.jobGroupId,
				});
			healthAfterRun = "ready";
			await setProgress({
				jobGroupId: data.jobGroupId,
				providers: [provider],
				surface,
				status: "completed",
				resultCount: successCount,
			});
			return true;
		} catch (error) {
			if (signal.aborted) {
				healthAfterRun = "ready";
				throw new StopProviderRunError(provider);
			}
			const loginRequired =
				error instanceof Error && error.message === "login_required";
			healthAfterRun = loginRequired ? "login_required" : "offline";
			lastFailure = loginRequired ? "login_required" : toErrorMessage(error);
			plog.error(
				`[run:${data.jobGroupId}][surface:android_app][device:${lease.device.id}] failed:`,
				lastFailure,
			);
			if (loginRequired) {
				await persist(
					data,
					provider,
					failedMobileResults(data, lastFailure),
					executionTime,
				);
				await setProgress({
					jobGroupId: data.jobGroupId,
					providers: [provider],
					surface,
					status: "failed",
					resultCount: 0,
				});
				return true;
			}
			if (batchStarted) {
				await persist(
					data,
					provider,
					failedMobileResults(data, lastFailure),
					executionTime,
				);
				await setProgress({
					jobGroupId: data.jobGroupId,
					providers: [provider],
					surface,
					status: "failed",
					resultCount: 0,
				});
				return true;
			}
		} finally {
			setCleanup(null);
			const failedDeviceId = lease.device.id;
			await lease.release();
			await updateDeviceHealth({
				id: failedDeviceId,
				status: healthAfterRun,
				lastError: healthAfterRun === "ready" ? null : lastFailure,
			});
			excludedDeviceIds.push(failedDeviceId);
		}

		lease = await acquireDevice({
			workspaceId: data.workspace_id,
			provider,
			leaseOwner: buildProviderJobId(data.jobGroupId, provider, surface),
			signal,
			excludeDeviceIds: excludedDeviceIds,
			timeoutMs: 5_000,
		});
	}

	await persist(
		data,
		provider,
		failedMobileResults(data, lastFailure),
		executionTime,
	);
	await setProgress({
		jobGroupId: data.jobGroupId,
		providers: [provider],
		surface,
		status: "failed",
		resultCount: 0,
	});
	return true;
}

async function runWeb(
	data: ProviderJobData,
	providers: Provider[],
	signal: AbortSignal,
	executionTime: string,
	setCleanup: (cleanup: (() => Promise<void>) | null) => void,
) {
	const provider = data.provider;
	const plog = createProviderLogger(provider);
	plog.log(`[run:${data.jobGroupId}][surface:web] started`);
	if (!(await hasRuntimeProviderAuth(provider))) {
		plog.warn("skipped (no authenticated session)");
		await setProgress({
			jobGroupId: data.jobGroupId,
			providers,
			surface: "web",
			status: "failed",
			resultCount: 0,
		});
		return true;
	}
	if (providers.some((current) => PROVIDER_CONFIGS[current].skip)) {
		plog.warn("skipped (skip: true in providerRegistry)");
		await setProgress({
			jobGroupId: data.jobGroupId,
			providers,
			surface: "web",
			status: "failed",
			resultCount: 0,
		});
		return true;
	}
	await setProgress({
		jobGroupId: data.jobGroupId,
		providers,
		surface: "web",
		status: "running",
	});
	if (
		(await redis.get(
			buildProviderCancelKey(data.jobGroupId, provider, "web"),
		)) === "1"
	) {
		throw new StopProviderRunError(provider);
	}
	let actionError: ProviderActionRequiredError | null = null;
	let result: AskPromptResult[];
	try {
		result = await agentHandler(
			PROVIDER_CONFIGS[provider].label,
			() => createAgent(provider),
			{
				user_id: data.user_id,
				workspace_id: data.workspace_id,
				prompts: data.prompts,
				created_at: executionTime,
			},
			provider,
			{
				signal,
				onAttemptStart: (attempt) =>
					setCleanup(async () => {
						await attempt.context.close().catch(() => {});
						await attempt.cleanup?.().catch(() => {});
					}),
				onAttemptComplete: () => setCleanup(null),
				onPromptProgress: (count) =>
					updateProviderProgress({
						jobGroupId: data.jobGroupId,
						provider,
						surface: "web",
						status: "running",
						resultCount: count,
					}),
			},
		);
	} catch (error) {
		if (!(error instanceof ProviderActionRequiredError)) throw error;
		actionError = error;
		result = error.partialResults;
		plog.warn(error.userMessage);
		await writeProviderAuthStatus(getAuthProviderForRuntimeProvider(provider), {
			connecting: false,
			lastUpdatedAt: new Date().toISOString(),
			syncedAt: null,
			actionRequired: error.actionRequired,
			error: error.userMessage,
			launcherPid: null,
		});
	}

	if (signal.aborted) throw new StopProviderRunError(provider);
	if (result.length) {
		await persist(data, provider, result, executionTime);
		runAnalysisInBackground({
			workspaceId: data.workspace_id,
			userId: data.user_id,
			provider,
			jobGroupId: data.jobGroupId,
		});
	}
	await setProgress({
		jobGroupId: data.jobGroupId,
		providers,
		surface: "web",
		status:
			!actionError && result.length === data.prompts.length
				? "completed"
				: "failed",
		error: actionError?.userMessage,
		resultCount: result.length,
	});
	return true;
}

export async function handleJob(job: Job<ProviderJobData>): Promise<boolean> {
	const data = job.data;
	if ((data.accountId ?? "default") !== getProviderAccountId())
		throw new ValidationError("Provider account does not match its queue");
	const surface = data.surface ?? "web";
	const { provider, jobGroupId, prompts } = data;
	if (!PROVIDER_LIST.includes(provider))
		throw new ValidationError(`Unknown provider: ${provider}`, { provider });
	if (!prompts?.length)
		throw new ValidationError("Agent job received no prompts", {
			provider,
			jobGroupId,
		});
	if (
		surface === "android_app" &&
		!(MOBILE_PROVIDER_LIST as readonly Provider[]).includes(provider)
	) {
		throw new ValidationError(`Unsupported Android provider: ${provider}`);
	}

	const providers = ownedProviders(provider, data.runProviders);
	await redis.set(
		`job:${jobGroupId}:result`,
		progressSeed(providers, prompts.length, surface),
		"EX",
		PROGRESS_TTL_SECONDS,
		"NX",
	);
	const controller = new AbortController();
	let cleanup: (() => Promise<void>) | null = null;
	activeStops.set(
		buildProviderJobId(jobGroupId, provider, surface),
		async () => {
			controller.abort();
			await cleanup?.().catch(() => {});
		},
	);

	try {
		if (surface === "android_app") {
			return await runMobile(
				data,
				provider as MobileProvider,
				controller.signal,
				new Date().toISOString(),
				(value) => {
					cleanup = value;
				},
			);
		}
		return await runWeb(
			data,
			providers,
			controller.signal,
			new Date().toISOString(),
			(value) => {
				cleanup = value;
			},
		);
	} catch (error) {
		if (error instanceof StopProviderRunError) {
			await setProgress({
				jobGroupId,
				providers,
				surface,
				status: "stopped",
				resultCount: 0,
			});
			return true;
		}
		createProviderLogger(provider).error("failed:", toErrorMessage(error));
		if (
			surface === "web" &&
			classifyError(error) === "logged_out" &&
			(AUTH_PROVIDER_LIST as readonly string[]).includes(provider)
		) {
			await writeProviderAuthStatus(provider as AuthProvider, {
				connecting: false,
				lastUpdatedAt: new Date().toISOString(),
				syncedAt: null,
				actionRequired: "login",
				error: "登录已失效，请在 AI 平台页面重新连接。",
				launcherPid: null,
			}).catch(() => {});
		}
		await setProgress({
			jobGroupId,
			providers,
			surface,
			status: "failed",
			resultCount: 0,
		});
		return true;
	} finally {
		activeStops.delete(buildProviderJobId(jobGroupId, provider, surface));
	}
}
