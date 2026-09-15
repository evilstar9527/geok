import { withProviderAccount } from "@oneglanse/services";
import { PROVIDER_ACCOUNT_IDS, type ProviderAccountId } from "@oneglanse/types";
import {
	cleanupExpiredDeviceArtifacts,
	getDeviceControlQueue,
	getProviderQueue,
	getQueueName,
	redis,
	updateProviderProgress,
	waitForRedis,
} from "@oneglanse/services";
import type { ExecutionSurface, Provider } from "@oneglanse/types";
import { MOBILE_PROVIDER_LIST, PROVIDER_LIST } from "@oneglanse/types";
import { logger } from "@oneglanse/utils";
import { Worker } from "bullmq";
import { env } from "./env.js";
import { handleDeviceControlJob } from "./worker/deviceControl.js";
import { runWithProviderExecutionGate } from "./worker/executionGate.js";
import { handleJob, stopActiveProviderRun } from "./worker/jobHandler.js";

// Exported so index.ts can call worker.close() during graceful shutdown.
export let workers: Worker[] = [];
const WORKER_LOCK_DURATION_MS = 4 * 60 * 60 * 1000;
const PROVIDER_STOP_CHANNEL = "oneglanse:agent:provider-stop";

async function drainQueues() {
	// Remove any waiting or active jobs left over from a previous run that was
	// killed before its jobs could complete. Without this, BullMQ's stall-check
	// would re-queue those jobs on startup and re-run providers the user never
	// explicitly triggered in this session.
	await Promise.all(
		workerTargets().map(async ({ provider, surface, accountId }) => {
			try {
				const queue = getProviderQueue(provider, surface, accountId);
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
							surface: data.surface ?? surface,
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
				logger.warn(
					`[agent] could not drain queue for ${surface}:${provider} on startup`,
				);
			}
		}),
	);
	logger.log("[agent] Queues drained — clean slate for this session.");
}

function workerTargets(): Array<{
	provider: Provider;
	surface: ExecutionSurface;
	accountId: ProviderAccountId;
}> {
	return [
		...PROVIDER_ACCOUNT_IDS.flatMap((accountId) =>
			PROVIDER_LIST.map((provider) => ({
				provider,
				surface: "web" as const,
				accountId,
			})),
		),
		...(env.ANDROID_DEVICE_AUTOMATION_ENABLED
			? MOBILE_PROVIDER_LIST.map((provider) => ({
					provider,
					surface: "android_app" as const,
					accountId: "default" as const,
				}))
			: []),
	];
}

async function startWorkers() {
	await waitForRedis();
	await drainQueues();
	const stopSubscriber = redis.duplicate();
	await stopSubscriber.connect();
	await stopSubscriber.subscribe(PROVIDER_STOP_CHANNEL);
	stopSubscriber.on("message", (channel, message) => {
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

	const connection = {
		host: env.REDIS_HOST,
		port: env.REDIS_PORT,
		password: env.REDIS_PASSWORD,
	};

	workers = workerTargets().map(({ provider, surface, accountId }) => {
		const queueName = getQueueName(provider, surface, accountId);
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
	});

	const controlQueue = getDeviceControlQueue();
	await controlQueue.waitUntilReady();
	const deviceControlWorker = new Worker(
		"oneglanse-device-control",
		handleDeviceControlJob,
		{ connection, concurrency: 1 },
	);
	deviceControlWorker.on("failed", (job, error) => {
		logger.error(`[device-control] job failed ${job?.id}`, error);
	});
	workers.push(deviceControlWorker);
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
