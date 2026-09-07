import type {
	DeviceDiagnosticResult,
	DiscoveredAndroidDevice,
} from "@oneglanse/types";
import { Queue, QueueEvents } from "bullmq";
import { env } from "../env.js";

export type DeviceControlJob =
	| { action: "discover"; workspaceId: string }
	| { action: "test"; workspaceId: string; deviceId: string };

export type DeviceControlResult =
	| { action: "discover"; devices: DiscoveredAndroidDevice[] }
	| { action: "test"; diagnostic: DeviceDiagnosticResult };

const connection = {
	host: env.REDIS_HOST,
	port: env.REDIS_PORT,
	password: env.REDIS_PASSWORD,
};

let queue: Queue<DeviceControlJob, DeviceControlResult> | null = null;
let events: QueueEvents | null = null;

export function getDeviceControlQueue() {
	queue ??= new Queue<DeviceControlJob, DeviceControlResult>(
		"oneglanse-device-control",
		{
			connection,
			defaultJobOptions: {
				attempts: 1,
				removeOnComplete: 100,
				removeOnFail: 100,
			},
		},
	);
	return queue;
}

export async function requestDeviceControl(
	data: DeviceControlJob,
): Promise<DeviceControlResult> {
	const controlQueue = getDeviceControlQueue();
	events ??= new QueueEvents("oneglanse-device-control", { connection });
	await Promise.all([controlQueue.waitUntilReady(), events.waitUntilReady()]);
	const job = await controlQueue.add(data.action, data);
	return job.waitUntilFinished(events, 120_000);
}
