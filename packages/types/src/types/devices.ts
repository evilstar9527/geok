import type { MobileProvider } from "./agent.js";

export const DEVICE_KIND_LIST = ["local_adb", "remote_appium"] as const;
export type DeviceKind = (typeof DEVICE_KIND_LIST)[number];

export const DEVICE_STATUS_LIST = [
	"ready",
	"busy",
	"offline",
	"login_required",
	"unsupported",
] as const;
export type DeviceStatus = (typeof DEVICE_STATUS_LIST)[number];

export interface DeviceConnection {
	id: string;
	workspaceId: string;
	name: string;
	kind: DeviceKind;
	serial: string;
	appiumUrl: string;
	supportedProviders: MobileProvider[];
	enabled: boolean;
	status: DeviceStatus;
	model: string | null;
	androidVersion: string | null;
	appiumVersion: string | null;
	lastCheckedAt: string | null;
	lastError: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface DeviceConnectionSecret {
	appiumUrl: string;
	headers?: Record<string, string>;
	capabilities?: Record<string, unknown>;
}

export interface DiscoveredAndroidDevice {
	serial: string;
	model: string | null;
	androidVersion: string | null;
	status: "device" | "offline" | "unauthorized" | "unknown";
}

export interface DeviceDiagnosticResult {
	status: DeviceStatus;
	model: string | null;
	androidVersion: string | null;
	appiumVersion: string | null;
	platformLogin: Partial<
		Record<MobileProvider, "ready" | "login_required" | "unsupported">
	>;
	error: string | null;
}
