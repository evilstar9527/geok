import { toErrorMessage } from "@oneglanse/errors";
import {
	ANALYSIS_QUEUE_NAME,
	type AnalysisJobData,
	analysePromptsForWorkspace,
	redis,
	waitForRedis,
} from "@oneglanse/services";
import { createProviderLogger, logger } from "@oneglanse/utils";
import { type Job, Worker } from "bullmq";
import { env } from "./env.js";
import { runWithAnalysisGate } from "./worker/analysisGate.js";

// The gate admits two analyses at a time, and a same-scope job waits on the
// scope chain before it takes a slot, so matching the worker concurrency to the
// gate keeps a queued same-scope job from occupying a slot while it waits.
const ANALYSIS_CONCURRENCY = 2;

let worker: Worker<AnalysisJobData> | null = null;

async function handleAnalysisJob(job: Job<AnalysisJobData>): Promise<void> {
	const { workspaceId, jobGroupId, provider, batch } = job.data;
	const plog = createProviderLogger(provider);
	const queuedAt = job.timestamp;

	// Overlapping scopes stay serial so their read-then-insert analysis queries
	// cannot select the same rows.
	await runWithAnalysisGate(
		JSON.stringify([workspaceId, jobGroupId, provider]),
		async () => {
			const startedAt = Date.now();
			plog.log(
				`analysing batch ${batch} of job group ${jobGroupId} (queued ${startedAt - queuedAt}ms)...`,
			);
			const result = await analysePromptsForWorkspace({
				workspaceId,
				analyzeAll: true,
				runId: jobGroupId,
				modelProvider: provider,
			});
			if (result.failedCount > 0) {
				// Throwing hands the batch back to BullMQ, which retries it with
				// backoff. Analysed rows are already marked, so a retry only revisits
				// what actually failed.
				throw new Error(
					`analysis incomplete: ${result.analysedCount} analysed, ${result.failedCount} failed (${Date.now() - startedAt}ms)`,
				);
			}
			plog.success(
				`analysed batch ${batch} of job group ${jobGroupId}: ${result.analysedCount} responses (${Date.now() - startedAt}ms)`,
			);
			if (result.remainingCount > 0) {
				// Rows stored while this job was scanning. Not a failure: the run
				// enqueues a job per stored batch, and its last one runs after every
				// row exists, so whichever job runs last for this scope clears them.
				plog.log(
					`${result.remainingCount} response(s) arrived during analysis of job group ${jobGroupId} — a later batch covers them`,
				);
			}
		},
	);
}

async function startAnalysisWorker(): Promise<void> {
	await waitForRedis();
	worker = new Worker<AnalysisJobData>(ANALYSIS_QUEUE_NAME, handleAnalysisJob, {
		connection: {
			host: env.REDIS_HOST,
			port: env.REDIS_PORT,
			password: env.REDIS_PASSWORD,
		},
		concurrency: ANALYSIS_CONCURRENCY,
	});

	worker.on("failed", (job, err) => {
		logger.error(
			`[analysis] job failed ${job?.id} (attempt ${job?.attemptsMade ?? 0}):`,
			toErrorMessage(err),
		);
	});

	logger.log(
		`[analysis] worker started → queue: ${ANALYSIS_QUEUE_NAME} (concurrency=${ANALYSIS_CONCURRENCY})`,
	);
}

const shutdown = async (signal: string) => {
	logger.log(`[analysis] Received ${signal}. Starting graceful shutdown...`);
	const forceExitTimer = setTimeout(
		() => {
			logger.error("[analysis] Graceful shutdown timed out. Forcing exit.");
			process.exit(1);
		},
		5 * 60 * 1000,
	);
	try {
		await worker?.close();
		await redis.quit();
		clearTimeout(forceExitTimer);
		logger.success("[analysis] Graceful shutdown complete.");
		process.exit(0);
	} catch (err) {
		logger.error("[analysis] Shutdown error:", err);
		clearTimeout(forceExitTimer);
		process.exit(1);
	}
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGQUIT", () => void shutdown("SIGQUIT"));

startAnalysisWorker().catch((err) => {
	logger.error("[analysis] worker failed to start:", err);
	process.exit(1);
});
