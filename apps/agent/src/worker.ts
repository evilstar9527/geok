import { existsSync } from "node:fs";
import { withProviderAccount } from "@oneglanse/services";
import {
	AUTH_CHANGED_CHANNEL,
	cleanupExpiredDeviceArtifacts,
	getAuthProviderForRuntimeProvider,
	getAuthSessionFile,
	getDeviceControlQueue,
	getQueueName,
	readAuthenticatedRuntimeProviders,
	redis,
	updateProviderProgress,
	waitForRedis,
} from "@oneglanse/services";
import { PROVIDER_ACCOUNT_IDS, type ProviderAccountId } from "@oneglanse/types";
import type { ExecutionSurface, Provider } from "@oneglanse/types";
import {
	AUTH_PROVIDER_LIST,
	MOBILE_PROVIDER_LIST,
	PROVIDER_LIST,
} from "@oneglanse/types";
import { logger } from "@oneglanse/utils";
import { Queue, Worker } from "bullmq";
import { env } from "./env.js";
import { handleDeviceControlJob } from "./worker/deviceControl.js";
import { runWithProviderExecutionGate } from "./worker/executionGate.js";
import { handleJob, stopActiveProviderRun } from "./worker/jobHandler.js";

// Exported so index.ts can call worker.close() during graceful shutdown.
export let workers: Worker[] = [];
const WORKER_LOCK_DURATION_MS = 4 * 60 * 60 * 1000;
const PROVIDER_STOP_CHANNEL = "oneglanse:agent:provider-stop";
const DEVICE_CONTROL_QUEUE_NAME = "oneglanse-device-control";
// Sessions get connected while this process runs, so the set of queues worth
// listening on is rescanned instead of being fixed at startup.
const WORKER_RESCAN_INTERVAL_MS = 60 * 1000;

const connection = {
	host: env.REDIS_HOST,
	port: env.REDIS_PORT,
	password: env.REDIS_PASSWORD,
};

type WorkerTarget = {
	provider: Provider;
	surface: ExecutionSurface;
	accountId: ProviderAccountId;
};

const runningWorkers = new Map<string, Worker>();

async function findAgentQueueNames(): Promise<string[]> {
	const names = new Set<string>();
	let cursor = "0";
	do {
		const [next, keys] = await redis.scan(
			cursor,
			"MATCH",
			"bull:oneglanse-agent-*",
			"COUNT",
			250,
		);
		cursor = next;
		for (const key of keys) {
			// Keys are bull:<queue name>:<suffix>, and a queue name never contains a
			// colon, so the second segment is the queue name.
			const name = key.split(":")[1];
			if (name?.startsWith("oneglanse-agent-")) names.add(name);
		}
	} while (cursor !== "0");
	return [...names];
}

async function drainQueues() {
	// Remove any waiting or active jobs left over from a previous run that was
	// killed before its jobs could complete. Without this, BullMQ's stall-check
	// would re-queue those jobs on startup and re-run providers the user never
	// explicitly triggered in this session.
	//
	// Only queues that actually exist in Redis are touched. Walking the full
	// account x provider matrix instead meant ~66 Queue objects, each holding its
	// own Redis connection open for the life of the process.
	const queueNames = await findAgentQueueNames();
	for (const queueName of queueNames) {
		const queue = new Queue(queueName, { connection });
		try {
			await queue.waitUntilReady();
			const jobs = (
				await Promise.all([
					queue.getActive(0, -1),
					queue.getWaiting(0, -1),
					queue.getDelayed(0, -1),
				])
			).flat();
			await Promise.all(
				jobs.map(async (job) => {
					const data = job.data as {
						jobGroupId?: string;
						provider?: Provider;
						surface?: ExecutionSurface;
					};
					if (!data.jobGroupId || !data.provider) return;
					await updateProviderProgress({
						jobGroupId: data.jobGroupId,
						provider: data.provider,
						surface: data.surface ?? "web",
						status: "failed",
						resultCount: 0,
					}).catch(() => {});
				}),
			);
			// No workers exist yet, so force-removing prior queue state is safe and
			// also clears long-lived locks left by a killed worker.
			await queue.obliterate({ force: true });
		} catch {
			// Non-fatal: if a queue can't be drained, log and continue
			logger.warn(`[agent] could not drain queue ${queueName} on startup`);
		} finally {
			await queue.close().catch(() => {});
		}
	}
	logger.log(
		`[agent] Queues drained (${queueNames.length}) — clean slate for this session.`,
	);
}

async function webWorkerTargets(): Promise<WorkerTarget[]> {
	const targets: WorkerTarget[] = [];
	for (const accountId of PROVIDER_ACCOUNT_IDS) {
		const providers = await withProviderAccount(accountId, async () => {
			// existsSync is the cheap gate: this runs on an interval, and
			// readAuthenticatedRuntimeProviders parses every session file it is
			// handed, which for a large storage state is not free.
			const connected = new Set(
				AUTH_PROVIDER_LIST.filter((authProvider) =>
					existsSync(getAuthSessionFile(authProvider)),
				),
			);
			const candidates = PROVIDER_LIST.filter((provider) =>
				connected.has(getAuthProviderForRuntimeProvider(provider)),
			);
			return candidates.length
				? readAuthenticatedRuntimeProviders(candidates)
				: [];
		});
		targets.push(
			...providers.map((provider) => ({
				provider,
				surface: "web" as const,
				accountId,
			})),
		);
	}
	return targets;
}

function mobileWorkerTargets(): WorkerTarget[] {
	if (!env.ANDROID_DEVICE_AUTOMATION_ENABLED) return [];
	return MOBILE_PROVIDER_LIST.map((provider) => ({
		provider,
		surface: "android_app" as const,
		accountId: "default" as const,
	}));
}

function startProviderWorker(
	{ provider, surface, accountId }: WorkerTarget,
	queueName: string,
): Worker {
	const worker = new Worker(
		queueName,
		(job) =>
			surface === "web"
				? withProviderAccount(accountId, () =>
						runWithProviderExecutionGate(provider, () => handleJob(job)),
					)
				: handleJob(job),
		{
			connection,
			concurrency: 1,
			lockDuration: WORKER_LOCK_DURATION_MS,
			stalledInterval: 60 * 1000,
			maxStalledCount: 5,
		},
	);

	worker.on("active", (job) => {
		// BullMQ fires "active" when the job is dequeued — before the stagger
		// delay and execution gate run. Real execution start is logged inside
		// runWithProviderExecutionGate after all gates are acquired.
		logger.debug(`[${surface}:${provider}] job queued ${job.id}`);
	});

	worker.on("completed", (job) => {
		logger.log(`[${surface}:${provider}] job completed ${job.id}`);
	});

	worker.on("failed", (job, err) => {
		logger.error(`[${surface}:${provider}] job failed ${job?.id}`, err);
	});

	logger.log(
		`[agent] provider worker started → queue: ${queueName} (concurrency=1)`,
	);
	return worker;
}

// Workers are added as sessions appear but never removed: a disconnected
// provider receives no jobs, because the enqueue path checks auth first, so an
// idle worker is cheaper than racing a running job to tear one down.
async function ensureProviderWorkers(): Promise<void> {
	const targets = [...(await webWorkerTargets()), ...mobileWorkerTargets()];
	for (const target of targets) {
		const queueName = getQueueName(
			target.provider,
			target.surface,
			target.accountId,
		);
		if (runningWorkers.has(queueName)) continue;
		runningWorkers.set(queueName, startProviderWorker(target, queueName));
	}
	workers = [...runningWorkers.values()];
}

async function startWorkers() {
	await waitForRedis();
	await drainQueues();
	const stopSubscriber = redis.duplicate();
	await stopSubscriber.connect();
	await stopSubscriber.subscribe(PROVIDER_STOP_CHANNEL, AUTH_CHANGED_CHANNEL);
	stopSubscriber.on("message", (channel, message) => {
		if (channel === AUTH_CHANGED_CHANNEL) {
			// A session was just saved. Pick up its queue now so the first run after
			// connecting does not sit until the periodic rescan.
			void ensureProviderWorkers().catch((error) => {
				logger.error("[agent] worker refresh after auth change failed", error);
			});
			return;
		}
		if (channel !== PROVIDER_STOP_CHANNEL) return;
		void (async () => {
			try {
				const payload = JSON.parse(message) as {
					jobGroupId?: string;
					provider?: (typeof PROVIDER_LIST)[number];
					surface?: ExecutionSurface;
				};
				if (!payload.jobGroupId || !payload.provider) {
					return;
				}
				await stopActiveProviderRun({
					jobGroupId: payload.jobGroupId,
					provider: payload.provider,
					surface: payload.surface,
				});
			} catch (error) {
				logger.error("[agent] failed to process provider stop request", error);
			}
		})();
	});

	await ensureProviderWorkers();
	if (runningWorkers.size === 0) {
		logger.warn(
			"[agent] no authenticated provider sessions yet — workers start as sessions connect",
		);
	}
	setInterval(() => {
		void ensureProviderWorkers().catch((error) => {
			logger.error("[agent] provider worker rescan failed", error);
		});
	}, WORKER_RESCAN_INTERVAL_MS).unref();

	const controlQueue = getDeviceControlQueue();
	await controlQueue.waitUntilReady();
	const deviceControlWorker = new Worker(
		DEVICE_CONTROL_QUEUE_NAME,
		handleDeviceControlJob,
		{ connection, concurrency: 1 },
	);
	deviceControlWorker.on("failed", (job, error) => {
		logger.error(`[device-control] job failed ${job?.id}`, error);
	});
	runningWorkers.set(DEVICE_CONTROL_QUEUE_NAME, deviceControlWorker);
	workers = [...runningWorkers.values()];
	logger.log("[agent] device control worker started");
	void cleanupExpiredDeviceArtifacts().catch((error) => {
		logger.error("[agent] artifact cleanup failed", error);
	});
	setInterval(
		() => {
			void cleanupExpiredDeviceArtifacts().catch((error) => {
				logger.error("[agent] artifact cleanup failed", error);
			});
		},
		24 * 60 * 60 * 1000,
	).unref();
}

startWorkers().catch((err) => {
	logger.error("Workers failed to start:", err);
	process.exit(1);
});
