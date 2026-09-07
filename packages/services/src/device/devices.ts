import { db, schema } from "@oneglanse/db";
import { NotFoundError } from "@oneglanse/errors";
import {
	type DeviceConnection,
	type DeviceConnectionSecret,
	type DeviceKind,
	type DeviceStatus,
	MOBILE_PROVIDER_LIST,
	type MobileProvider,
} from "@oneglanse/types";
import { and, eq, isNull } from "drizzle-orm";
import { decryptDeviceConfig, encryptDeviceConfig } from "./encryption.js";

type DeviceRow = typeof schema.deviceConnections.$inferSelect;

function providers(values: string[]): MobileProvider[] {
	return values.filter((value): value is MobileProvider =>
		(MOBILE_PROVIDER_LIST as readonly string[]).includes(value),
	);
}

function toDevice(row: DeviceRow): DeviceConnection {
	return {
		id: row.id,
		workspaceId: row.workspaceId,
		name: row.name,
		kind: row.kind,
		serial: row.serial,
		appiumUrl: row.encryptedConfig ? "configured" : "legacy_configured",
		supportedProviders: providers(row.supportedProviders),
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

export async function listDeviceConnections(
	workspaceId: string,
): Promise<DeviceConnection[]> {
	const rows = await db.query.deviceConnections.findMany({
		where: (device, { and, eq, isNull }) =>
			and(eq(device.workspaceId, workspaceId), isNull(device.deletedAt)),
		orderBy: (device, { asc }) => [asc(device.name)],
	});
	return rows.map(toDevice);
}

export async function getDeviceConnectionRecord(
	id: string,
): Promise<DeviceRow> {
	const row = await db.query.deviceConnections.findFirst({
		where: (device, { and, eq, isNull }) =>
			and(eq(device.id, id), isNull(device.deletedAt)),
	});
	if (!row) throw new NotFoundError("Device connection not found.");
	return row;
}

export async function getDeviceConnectionSecret(
	id: string,
): Promise<DeviceConnectionSecret> {
	const row = await getDeviceConnectionRecord(id);
	return row.encryptedConfig
		? decryptDeviceConfig(row.encryptedConfig)
		: { appiumUrl: row.appiumUrl };
}

export async function createDeviceConnection(args: {
	workspaceId: string;
	createdBy: string;
	name: string;
	kind: DeviceKind;
	serial: string;
	appiumUrl: string;
	supportedProviders: MobileProvider[];
	secret?: DeviceConnectionSecret;
}): Promise<DeviceConnection> {
	const [row] = await db
		.insert(schema.deviceConnections)
		.values({
			workspaceId: args.workspaceId,
			createdBy: args.createdBy,
			name: args.name,
			kind: args.kind,
			serial: args.serial,
			appiumUrl: "[encrypted]",
			supportedProviders: args.supportedProviders,
			encryptedConfig: args.secret ? encryptDeviceConfig(args.secret) : null,
		})
		.returning();
	if (!row) throw new Error("Failed to create device connection.");
	return toDevice(row);
}

export async function updateDeviceConnection(args: {
	id: string;
	workspaceId: string;
	name?: string;
	enabled?: boolean;
	supportedProviders?: MobileProvider[];
	secret?: DeviceConnectionSecret;
}): Promise<DeviceConnection> {
	const values: Partial<typeof schema.deviceConnections.$inferInsert> = {
		updatedAt: new Date(),
	};
	if (args.name !== undefined) values.name = args.name;
	if (args.enabled !== undefined) values.enabled = args.enabled;
	if (args.supportedProviders !== undefined)
		values.supportedProviders = args.supportedProviders;
	if (args.secret !== undefined) {
		values.appiumUrl = "[encrypted]";
		values.encryptedConfig = encryptDeviceConfig(args.secret);
	}
	const [row] = await db
		.update(schema.deviceConnections)
		.set(values)
		.where(
			and(
				eq(schema.deviceConnections.id, args.id),
				eq(schema.deviceConnections.workspaceId, args.workspaceId),
				isNull(schema.deviceConnections.deletedAt),
			),
		)
		.returning();
	if (!row) throw new NotFoundError("Device connection not found.");
	return toDevice(row);
}

export async function updateDeviceHealth(args: {
	id: string;
	status: DeviceStatus;
	model?: string | null;
	androidVersion?: string | null;
	appiumVersion?: string | null;
	lastError?: string | null;
}): Promise<void> {
	await db
		.update(schema.deviceConnections)
		.set({
			status: args.status,
			model: args.model,
			androidVersion: args.androidVersion,
			appiumVersion: args.appiumVersion,
			lastError: args.lastError ?? null,
			lastCheckedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(schema.deviceConnections.id, args.id));
}

export async function deleteDeviceConnection(args: {
	id: string;
	workspaceId: string;
}): Promise<void> {
	await db
		.update(schema.deviceConnections)
		.set({ enabled: false, deletedAt: new Date(), updatedAt: new Date() })
		.where(
			and(
				eq(schema.deviceConnections.id, args.id),
				eq(schema.deviceConnections.workspaceId, args.workspaceId),
				isNull(schema.deviceConnections.deletedAt),
			),
		);
}
