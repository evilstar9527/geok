import {
	getDeviceConnectionRecord,
	getDeviceConnectionSecret,
	updateDeviceHealth,
} from "@oneglanse/services";
import type {
	DeviceControlJob,
	DeviceControlResult,
} from "@oneglanse/services";
import type { DeviceConnection } from "@oneglanse/types";
import type { Job } from "bullmq";
import { discoverLocalAndroidDevices } from "../mobile/discovery.js";
import { diagnoseAppiumDevice } from "../mobile/runner.js";

function publicDevice(
	row: Awaited<ReturnType<typeof getDeviceConnectionRecord>>,
): DeviceConnection {
	return {
		id: row.id,
		workspaceId: row.workspaceId,
		name: row.name,
		kind: row.kind,
		serial: row.serial,
		appiumUrl: row.appiumUrl,
		supportedProviders:
			row.supportedProviders as DeviceConnection["supportedProviders"],
		enabled: row.enabled,
		status: row.status,
		model: row.model,
		androidVersion: row.androidVersion,
		appiumVersion: row.appiumVersion,
		lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
		lastError: row.lastError,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

export async function handleDeviceControlJob(
	job: Job<DeviceControlJob, DeviceControlResult>,
): Promise<DeviceControlResult> {
	if (job.data.action === "discover") {
		return { action: "discover", devices: await discoverLocalAndroidDevices() };
	}
	const row = await getDeviceConnectionRecord(job.data.deviceId);
	if (row.workspaceId !== job.data.workspaceId) {
		throw new Error("Device does not belong to this workspace.");
	}
	const diagnostic = await diagnoseAppiumDevice({
		device: publicDevice(row),
		secret: await getDeviceConnectionSecret(row.id),
	});
	await updateDeviceHealth({
		id: row.id,
		status: diagnostic.status,
		model: diagnostic.model,
		androidVersion: diagnostic.androidVersion,
		appiumVersion: diagnostic.appiumVersion,
		lastError: diagnostic.error,
	});
	return { action: "test", diagnostic };
}
