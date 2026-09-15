import type { ExecutionSurface, Provider } from "@oneglanse/types";
import { Queue } from "bullmq";
import { env } from "../env.js";

export const ANALYSIS_QUEUE_NAME = "oneglanse-analysis";

export type AnalysisJobData = {
	jobGroupId: string;
	workspaceId: string;
	userId: string;
	provider: Provider;
	surface: ExecutionSurface;
	// Distinguishes the flushes of one provider run. Each stored batch gets its
	// own job id so a later batch is never swallowed by BullMQ's duplicate-id
	// check while an earlier job for the same run is still active.
	batch: number;
};

const connection = {
	host: env.REDIS_HOST,
	port: env.REDIS_PORT,
	password: env.REDIS_PASSWORD,
};

let queue: Queue<AnalysisJobData> | null = null;

export function getAnalysisQueue(): Queue<AnalysisJobData> {
	if (!queue) {
		queue = new Queue<AnalysisJobData>(ANALYSIS_QUEUE_NAME, {
			connection,
			defaultJobOptions: {
				// Analysis used to run as a detached promise inside the agent worker,
				// so a restart or an OOM kill dropped it with no record. Retries here
				// are the point of moving it onto a queue.
				attempts: 3,
				backoff: { type: "exponential", delay: 30_000 },
				removeOnComplete: true,
				removeOnFail: 100,
			},
		});
	}
	return queue;
}

export function buildAnalysisJobId(data: AnalysisJobData): string {
	return `${data.jobGroupId}__${data.surface}__${data.provider}__${data.batch}`;
}

export async function enqueueAnalysisRun(data: AnalysisJobData): Promise<void> {
	const analysisQueue = getAnalysisQueue();
	await analysisQueue.waitUntilReady();
	await analysisQueue.add("analyse-run", data, {
		jobId: buildAnalysisJobId(data),
	});
}
