import { createHash } from "node:crypto";
import {
	getDeviceConnectionSecret,
	listDeviceConnections,
	redis,
	updateDeviceHealth,
} from "@oneglanse/services";
import type {
	DeviceConnection,
	DeviceConnectionSecret,
	MobileProvider,
} from "@oneglanse/types";

const LEASE_TTL_MS = 4 * 60 * 60 * 1000;
const WAIT_TIMEOUT_MS = Number(
	process.env.DEVICE_WAIT_TIMEOUT_MS ?? 10 * 60_000,
);

export interface DeviceLease {
	device: DeviceConnection;
	secret: DeviceConnectionSecret;
	release: () => Promise<void>;
}

function leaseKey(device: Pick<DeviceConnection, "kind" | "serial">): string {
	const physicalId = createHash("sha256")
		.update(`${device.kind}:${device.serial}`)
		.digest("hex");
	return `device:${physicalId}:lease`;
}

async function releaseLease(key: string, owner: string): Promise<void> {
	await redis.eval(
		"if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0",
		1,
		key,
		owner,
	);
}

async function renewLease(key: string, owner: string): Promise<void> {
	await redis.eval(
		"if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('PEXPIRE', KEYS[1], ARGV[2]) end return 0",
		1,
		key,
		owner,
		String(LEASE_TTL_MS),
	);
}

async function delay(ms: number, signal?: AbortSignal): Promise<void> {
	if (signal?.aborted) throw new Error("Device acquisition cancelled.");
	await new Promise<void>((resolve, reject) => {
		const timer = setTimeout(resolve, ms);
		signal?.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				reject(new Error("Device acquisition cancelled."));
			},
			{ once: true },
		);
	});
}

export async function acquireDevice(args: {
	workspaceId: string;
	provider: MobileProvider;
	leaseOwner: string;
	signal?: AbortSignal;
	excludeDeviceIds?: readonly string[];
	timeoutMs?: number;
}): Promise<DeviceLease | null> {
	const deadline = Date.now() + (args.timeoutMs ?? WAIT_TIMEOUT_MS);
	while (Date.now() < deadline) {
		const devices = await listDeviceConnections(args.workspaceId);
		for (const device of devices) {
			if (args.excludeDeviceIds?.includes(device.id)) continue;
			if (
				!device.enabled ||
				device.status !== "ready" ||
				!device.supportedProviders.includes(args.provider)
			) {
				continue;
			}
			const key = leaseKey(device);
			const acquired = await redis.set(
				key,
				args.leaseOwner,
				"PX",
				LEASE_TTL_MS,
				"NX",
			);
			if (acquired !== "OK") continue;

			let secret: DeviceConnectionSecret;
			try {
				secret = await getDeviceConnectionSecret(device.id);
			} catch (error) {
				await releaseLease(key, args.leaseOwner);
				throw error;
			}
			await updateDeviceHealth({ id: device.id, status: "busy" });
			const heartbeat = setInterval(() => {
				void renewLease(key, args.leaseOwner).catch(() => {});
			}, 30_000);
			return {
				device,
				secret,
				release: async () => {
					clearInterval(heartbeat);
					await releaseLease(key, args.leaseOwner);
				},
			};
		}
		await delay(2_000, args.signal);
	}
	return null;
}
