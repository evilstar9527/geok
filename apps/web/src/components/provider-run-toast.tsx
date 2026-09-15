"use client";

import { useSafeSearchParams } from "@/lib/navigation/use-safe-search-params";
import { api } from "@/trpc/react";
import {
	type ExecutionSurface,
	PROVIDER_LIST,
	type Provider,
} from "@oneglanse/types";
import { ProviderRunStatusCard, toast } from "@oneglanse/ui";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ProviderState = "pending" | "running" | "completed" | "failed" | "stopped";

type ProviderProgressResponse = {
	updateId?: number;
	providers?: Record<string, ProviderState>;
	results?: Record<string, number>;
	errors?: Record<string, string>;
	stats?: { totalPrompts?: number };
};

type DisplayPhase = "pending" | "running" | "completed" | "failed" | "stopped";
type RunTarget = { id: string; provider: Provider; surface: ExecutionSurface };

function parseRunTarget(id: string): RunTarget | null {
	const [candidateSurface, candidateProvider] = id.split(":");
	const surface = candidateProvider ? candidateSurface : "web";
	const provider = candidateProvider ?? candidateSurface;
	if (
		(surface !== "web" && surface !== "android_app") ||
		!PROVIDER_LIST.includes(provider as Provider)
	)
		return null;
	return { id, provider: provider as Provider, surface };
}

const PROVIDER_RUN_TOAST_ID = "provider-run-progress";
const COMPLETION_TOAST_DURATION_MS = 1400;
const STOPPED_HANDOFF_DELAY_MS = 350;
const ACTIVE_PROVIDER_RUN_STORAGE_KEY = "oneglanse.active-provider-run";
const ACTIVE_PROVIDER_RUN_EVENT = "oneglanse:active-provider-run";

type ActiveProviderRun = {
	workspaceId: string;
	jobId: string;
};

function readActiveProviderRun(): ActiveProviderRun | null {
	if (typeof window === "undefined") return null;
	const raw = window.localStorage.getItem(ACTIVE_PROVIDER_RUN_STORAGE_KEY);
	if (!raw) return null;

	try {
		const parsed = JSON.parse(raw) as Partial<ActiveProviderRun>;
		if (
			typeof parsed.workspaceId !== "string" ||
			typeof parsed.jobId !== "string" ||
			parsed.workspaceId.length === 0 ||
			parsed.jobId.length === 0
		) {
			return null;
		}
		return {
			workspaceId: parsed.workspaceId,
			jobId: parsed.jobId,
		};
	} catch {
		return null;
	}
}

export function persistActiveProviderRun(args: ActiveProviderRun): void {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(
		ACTIVE_PROVIDER_RUN_STORAGE_KEY,
		JSON.stringify(args),
	);
	window.dispatchEvent(new Event(ACTIVE_PROVIDER_RUN_EVENT));
}

export function clearActiveProviderRun(): void {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(ACTIVE_PROVIDER_RUN_STORAGE_KEY);
	window.dispatchEvent(new Event(ACTIVE_PROVIDER_RUN_EVENT));
}

/**
 * Handles all non-success agent run result states.
 * Call this after every `api.agent.run.mutateAsync` call.
 *
 * Returns `true` if the run was queued successfully (caller should proceed).
 * Returns `false` for all error/non-success states (caller should stop).
 */
export function handleAgentRunResult(
	result: {
		status: string;
		jobId?: string | null;
	},
	options: {
		/** Called when the result is not a successful queue. */
		onDone: () => void;
	},
): result is { status: "queued"; jobId: string } {
	const { onDone } = options;

	if (result.status !== "queued" || !result.jobId) {
		clearActiveProviderRun();
		onDone();
		return false;
	}

	return true;
}

function ProviderRunToastCard({
	provider,
	phase,
	error,
	promptNumber,
	totalPrompts,
	onStop,
	isStopping,
}: {
	provider: Provider;
	phase: DisplayPhase;
	error?: string;
	promptNumber?: number;
	totalPrompts?: number;
	onStop?: () => void | Promise<void>;
	isStopping?: boolean;
}) {
	return (
		<ProviderRunStatusCard
			provider={provider}
			phase={phase}
			error={error}
			onStop={phase === "running" ? onStop : undefined}
			isStopping={isStopping}
			promptNumber={promptNumber}
			totalPrompts={totalPrompts}
		/>
	);
}

function showProviderToast(args: {
	provider: Provider;
	phase: DisplayPhase;
	error?: string;
	promptNumber?: number;
	totalPrompts?: number;
	onStop?: () => void | Promise<void>;
	isStopping?: boolean;
}) {
	toast.custom(
		() => (
			<ProviderRunToastCard
				provider={args.provider}
				phase={args.phase}
				error={args.error}
				promptNumber={args.promptNumber}
				totalPrompts={args.totalPrompts}
				onStop={args.onStop}
				isStopping={args.isStopping}
			/>
		),
		{
			id: PROVIDER_RUN_TOAST_ID,
			duration:
				args.phase === "pending" || args.phase === "running"
					? Number.POSITIVE_INFINITY
					: args.phase === "stopped"
						? STOPPED_HANDOFF_DELAY_MS
						: COMPLETION_TOAST_DURATION_MS,
		},
	);
}

function useProviderRunToast(args: {
	active: boolean;
	workspaceId: string;
	jobId: string | null;
	response: unknown;
}) {
	const { active, workspaceId, jobId, response } = args;
	const stopProviderMutation = api.agent.stopProvider.useMutation();
	const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const latestParsedRef = useRef<{
		updateId: number;
		providers: Record<string, ProviderState>;
		results: Record<string, number>;
		totalPrompts?: number;
	}>({
		updateId: 0,
		providers: {},
		results: {},
		totalPrompts: undefined,
	});
	const previousProviderStatesRef = useRef<Record<string, ProviderState>>({});
	const [stoppingProvider, setStoppingProvider] = useState<string | null>(null);
	const displayRef = useRef<{
		targetId: string;
		provider: Provider;
		surface: ExecutionSurface;
		phase: DisplayPhase;
		promptNumber?: number;
	} | null>(null);

	const parsed = useMemo(() => {
		const data = response as ProviderProgressResponse | null | undefined;
		return {
			updateId: data?.updateId ?? 0,
			providers: (data?.providers ?? {}) as Record<string, ProviderState>,
			results: (data?.results ?? {}) as Record<string, number>,
			errors: data?.errors ?? {},
			totalPrompts: data?.stats?.totalPrompts,
		};
	}, [response]);

	useEffect(() => {
		latestParsedRef.current = parsed;
	}, [parsed]);

	const buildStopHandler = useCallback(
		(target: RunTarget) => {
			return async () => {
				if (!jobId || stoppingProvider === target.id) return;
				setStoppingProvider(target.id);
				try {
					await stopProviderMutation.mutateAsync({
						workspaceId,
						jobId,
						provider: target.provider,
						surface: target.surface,
					});
				} catch {
					// Stop request failed — release the stopping state so the user can retry.
					setStoppingProvider((current) =>
						current === target.id ? null : current,
					);
				}
			};
		},
		[jobId, stopProviderMutation, stoppingProvider, workspaceId],
	);

	useEffect(() => {
		return () => {
			if (completionTimerRef.current) {
				clearTimeout(completionTimerRef.current);
				completionTimerRef.current = null;
			}
			toast.dismiss(PROVIDER_RUN_TOAST_ID);
		};
	}, []);

	useEffect(() => {
		if (!active) {
			if (completionTimerRef.current) {
				clearTimeout(completionTimerRef.current);
				completionTimerRef.current = null;
			}
			displayRef.current = null;
			setStoppingProvider(null);
			toast.dismiss(PROVIDER_RUN_TOAST_ID);
			return;
		}

		if (!response) {
			displayRef.current = null;
			return;
		}

		const providerStates = parsed.providers;
		const previousStates = previousProviderStatesRef.current;
		const targets = Object.keys(providerStates)
			.map(parseRunTarget)
			.filter((target): target is RunTarget => Boolean(target));
		const pendingProviders = targets.filter(
			(target) => providerStates[target.id] === "pending",
		);
		const runningProviders = targets.filter(
			(target) => providerStates[target.id] === "running",
		);
		const currentDisplay = displayRef.current;
		const transitionedProvider = targets.find((target) => {
			const previousState = previousStates[target.id];
			const nextState = providerStates[target.id];

			return (
				previousState === "running" &&
				(nextState === "completed" ||
					nextState === "failed" ||
					nextState === "stopped")
			);
		});

		previousProviderStatesRef.current = providerStates;

		if (transitionedProvider) {
			const nextPhase =
				providerStates[transitionedProvider.id] === "completed"
					? "completed"
					: providerStates[transitionedProvider.id] === "stopped"
						? "stopped"
						: "failed";

			displayRef.current = {
				...transitionedProvider,
				targetId: transitionedProvider.id,
				phase: nextPhase,
			};
			if (stoppingProvider === transitionedProvider.id) {
				setStoppingProvider(null);
			}
			if (jobId) {
				showProviderToast({
					provider: transitionedProvider.provider,
					phase: nextPhase,
					error: parsed.errors[transitionedProvider.id],
					onStop: buildStopHandler(transitionedProvider),
					isStopping: stoppingProvider === transitionedProvider.id,
				});
			}

			if (completionTimerRef.current) {
				clearTimeout(completionTimerRef.current);
			}
			const handoffDelay =
				nextPhase === "stopped"
					? STOPPED_HANDOFF_DELAY_MS
					: COMPLETION_TOAST_DURATION_MS;
			completionTimerRef.current = setTimeout(() => {
				completionTimerRef.current = null;
				const latest = latestParsedRef.current;
				const nextRunningProvider = Object.keys(latest.providers)
					.map(parseRunTarget)
					.find(
						(target) => target && latest.providers[target.id] === "running",
					);
				if (nextRunningProvider) {
					const nextPromptNumber =
						(latest.results[nextRunningProvider.id] ?? 0) > 0
							? latest.results[nextRunningProvider.id]
							: undefined;
					displayRef.current = {
						...nextRunningProvider,
						targetId: nextRunningProvider.id,
						phase: "running",
						promptNumber: nextPromptNumber,
					};
					if (jobId) {
						showProviderToast({
							provider: nextRunningProvider.provider,
							phase: "running",
							promptNumber: nextPromptNumber,
							totalPrompts: latest.totalPrompts,
							onStop: buildStopHandler(nextRunningProvider),
							isStopping: stoppingProvider === nextRunningProvider.id,
						});
					}
					return;
				}

				displayRef.current = null;
				toast.dismiss(PROVIDER_RUN_TOAST_ID);
			}, handoffDelay);
			return;
		}

		if (
			currentDisplay?.phase === "completed" ||
			currentDisplay?.phase === "failed" ||
			currentDisplay?.phase === "stopped"
		) {
			return;
		}

		const nextRunningProvider = runningProviders[0];
		const nextPromptNumber =
			nextRunningProvider && (parsed.results[nextRunningProvider.id] ?? 0) > 0
				? parsed.results[nextRunningProvider.id]
				: undefined;

		if (!nextRunningProvider) {
			const nextPendingProvider = pendingProviders[0];
			if (nextPendingProvider) {
				if (
					currentDisplay?.targetId === nextPendingProvider.id &&
					currentDisplay.phase === "pending"
				) {
					return;
				}

				if (completionTimerRef.current) {
					clearTimeout(completionTimerRef.current);
					completionTimerRef.current = null;
				}

				displayRef.current = {
					...nextPendingProvider,
					targetId: nextPendingProvider.id,
					phase: "pending",
				};
				if (jobId) {
					showProviderToast({
						provider: nextPendingProvider.provider,
						phase: "pending",
						onStop: buildStopHandler(nextPendingProvider),
						isStopping: stoppingProvider === nextPendingProvider.id,
					});
				}
				return;
			}

			if (
				parsed.updateId > 0 &&
				parsed.providers &&
				Object.keys(parsed.providers).length > 0
			) {
				displayRef.current = null;
				toast.dismiss(PROVIDER_RUN_TOAST_ID);
			}
			return;
		}

		if (
			currentDisplay?.targetId === nextRunningProvider.id &&
			currentDisplay.phase === "running" &&
			currentDisplay.promptNumber === nextPromptNumber
		) {
			return;
		}

		if (completionTimerRef.current) {
			clearTimeout(completionTimerRef.current);
			completionTimerRef.current = null;
		}

		displayRef.current = {
			...nextRunningProvider,
			targetId: nextRunningProvider.id,
			phase: "running",
			promptNumber: nextPromptNumber,
		};
		if (jobId) {
			showProviderToast({
				provider: nextRunningProvider.provider,
				phase: "running",
				promptNumber: nextPromptNumber,
				totalPrompts: parsed.totalPrompts,
				onStop: buildStopHandler(nextRunningProvider),
				isStopping: stoppingProvider === nextRunningProvider.id,
			});
		}
	}, [active, buildStopHandler, jobId, parsed, response, stoppingProvider]);
}

export function ProviderRunToastManager() {
	const router = useRouter();
	const utils = api.useUtils();
	const pathname = usePathname();
	const searchParams = useSafeSearchParams();
	const urlWorkspaceId = searchParams.get("workspace") ?? "";
	const urlJobId = searchParams.get("jobId") ?? "";
	const [persistedRun, setPersistedRun] = useState<ActiveProviderRun | null>(
		null,
	);
	const [dismissedJobId, setDismissedJobId] = useState<string | null>(null);

	useEffect(() => {
		const syncPersistedRun = () => {
			setPersistedRun(readActiveProviderRun());
		};

		syncPersistedRun();
		window.addEventListener(ACTIVE_PROVIDER_RUN_EVENT, syncPersistedRun);
		window.addEventListener("storage", syncPersistedRun);

		return () => {
			window.removeEventListener(ACTIVE_PROVIDER_RUN_EVENT, syncPersistedRun);
			window.removeEventListener("storage", syncPersistedRun);
		};
	}, []);

	useEffect(() => {
		if (!urlWorkspaceId || !urlJobId) return;
		if (dismissedJobId === urlJobId) return;
		const nextRun = { workspaceId: urlWorkspaceId, jobId: urlJobId };
		persistActiveProviderRun(nextRun);
		setPersistedRun(nextRun);
	}, [dismissedJobId, urlJobId, urlWorkspaceId]);

	const activeRun =
		urlWorkspaceId && urlJobId && dismissedJobId !== urlJobId
			? { workspaceId: urlWorkspaceId, jobId: urlJobId }
			: persistedRun;
	const activeWorkspaceId = activeRun?.workspaceId ?? "";

	const jobStatusQuery = api.agent.status.useQuery(
		{
			workspaceId: activeRun?.workspaceId ?? "",
			jobId: activeRun?.jobId ?? "",
		},
		{
			enabled: !!activeRun,
			refetchInterval: 2000,
			refetchIntervalInBackground: true,
			refetchOnMount: "always",
			staleTime: 0,
		},
	);

	useProviderRunToast({
		active: !!activeRun,
		workspaceId: activeRun?.workspaceId ?? "",
		jobId: activeRun?.jobId ?? null,
		response: jobStatusQuery.data?.response,
	});

	useEffect(() => {
		// "missing" = 后端已经没有这个 run 的进度了(worker 重启、TTL 过期)。
		// 和 completed 一样收尾,否则 toast 会永远挂在最后一次收到的进度上。
		const jobStatus = jobStatusQuery.data?.status;
		if (jobStatus !== "completed" && jobStatus !== "missing") return;
		if (jobStatus === "missing") {
			toast.dismiss(PROVIDER_RUN_TOAST_ID);
		} else if (activeWorkspaceId) {
			const workspaceId = activeWorkspaceId;
			void Promise.all([
				utils.analysis.fetchAnalysis.invalidate({ workspaceId }),
				utils.prompt.fetchPromptSources.invalidate({ workspaceId }),
				utils.workspace.getCronTiming.invalidate({ workspaceId }),
			]);
		}
		clearActiveProviderRun();
		setPersistedRun(null);
		if (activeRun?.jobId) {
			setDismissedJobId(activeRun.jobId);
		}

		if (urlJobId && pathname) {
			const params = new URLSearchParams(searchParams.toString());
			params.delete("jobId");
			const query = params.toString();
			router.replace(query ? `${pathname}?${query}` : pathname, {
				scroll: false,
			});
		}
	}, [
		activeRun?.jobId,
		activeWorkspaceId,
		jobStatusQuery.data?.status,
		pathname,
		router,
		searchParams,
		urlJobId,
		utils,
	]);

	return null;
}
