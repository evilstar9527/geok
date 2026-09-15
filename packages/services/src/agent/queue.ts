import {
	getProviderAccountId,
	parseProviderAccountId,
} from "./accountScope.js";
import type { ExecutionSurface, Provider } from "@oneglanse/types";
import { Queue } from "bullmq";
import { env } from "../env.js";

const DEFAULT_JOB_OPTIONS = {
	attempts: 1,
	removeOnComplete: true,
	// Cap retained failures. `false` kept every failed job in Redis forever, so a
	// long-lived instance grew without bound until the (512 MB) Redis OOM'd — which
	// also drops the queues. Matches the limit getDeviceControlQueue already uses.
	removeOnFail: 100,
} as const;

const connection = {
	host: env.REDIS_HOST,
	port: env.REDIS_PORT,
	password: env.REDIS_PASSWORD,
};

const queues = new Map<string, Queue>();

export function getQueueName(
	provider: Provider,
	surface: ExecutionSurface = "web",
	accountId = getProviderAccountId(),
): string {
	parseProviderAccountId(accountId);
	return `oneglanse-agent-${surface}-${provider}${accountId === "default" ? "" : `-${accountId}`}`;
}

export function getProviderQueue(
	provider: Provider,
	surface: ExecutionSurface = "web",
	accountId = getProviderAccountId(),
): Queue {
	parseProviderAccountId(accountId);
	const key = `${accountId}:${surface}:${provider}`;
	let q = queues.get(key);
	if (!q) {
		q = new Queue(getQueueName(provider, surface, accountId), {
			connection,
			defaultJobOptions: DEFAULT_JOB_OPTIONS,
		});
		queues.set(key, q);
	}
	return q;
}
