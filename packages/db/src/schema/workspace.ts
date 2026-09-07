import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import z from "zod";
import { user } from "./auth.js";

export const workspaceEnabledProviderEnum = pgEnum(
	"workspace_enabled_provider",
	[
		"chatgpt",
		"perplexity",
		"gemini",
		"google",
		"claude",
		"doubao",
		"deepseek",
		"kimi",
		"yuanbao",
		"qianwen",
		"diandian",
	],
);

export const workspaces = pgTable("workspaces", {
	id: varchar("id", { length: 256 }).primaryKey(),
	name: varchar("name", { length: 256 }).notNull(),
	slug: varchar("slug", { length: 256 }).notNull(),
	domain: varchar("domain", { length: 256 }).notNull(),
	tenantId: varchar("tenant_id", { length: 256 }).notNull(),
	schedule: varchar("schedule", { length: 64 }),
	enabledProviders: workspaceEnabledProviderEnum("enabled_providers").array(),
	selectedPromptIds: text("selected_prompt_ids").array(),
	exposureTerms: text("exposure_terms").array().default([]).notNull(),
	scheduledExecutionSurfaces: text("scheduled_execution_surfaces")
		.array()
		.default(["web"])
		.notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	deletedAt: timestamp("deleted_at"),
});

export const deviceKindEnum = pgEnum("device_kind", [
	"local_adb",
	"remote_appium",
]);

export const deviceStatusEnum = pgEnum("device_status", [
	"ready",
	"busy",
	"offline",
	"login_required",
	"unsupported",
]);

export const deviceArtifactKindEnum = pgEnum("device_artifact_kind", [
	"success",
	"failure",
]);

export const deviceConnections = pgTable(
	"device_connections",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 128 }).notNull(),
		kind: deviceKindEnum("kind").notNull(),
		serial: varchar("serial", { length: 256 }).notNull(),
		appiumUrl: varchar("appium_url", { length: 2048 }).notNull(),
		encryptedConfig: text("encrypted_config"),
		supportedProviders: text("supported_providers")
			.array()
			.default([])
			.notNull(),
		enabled: boolean("enabled").default(true).notNull(),
		status: deviceStatusEnum("status").default("offline").notNull(),
		model: varchar("model", { length: 256 }),
		androidVersion: varchar("android_version", { length: 64 }),
		appiumVersion: varchar("appium_version", { length: 64 }),
		lastCheckedAt: timestamp("last_checked_at"),
		lastError: text("last_error"),
		createdBy: text("created_by")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => ({
		workspaceIdx: index("device_connections_workspace_id_idx").on(
			table.workspaceId,
		),
	}),
);

export const deviceArtifacts = pgTable(
	"device_artifacts",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		runId: varchar("run_id", { length: 128 }).notNull(),
		responseId: varchar("response_id", { length: 128 }),
		promptId: varchar("prompt_id", { length: 256 }).notNull(),
		provider: varchar("provider", { length: 64 }).notNull(),
		deviceId: uuid("device_id").references(() => deviceConnections.id, {
			onDelete: "set null",
		}),
		kind: deviceArtifactKindEnum("kind").notNull(),
		storageKey: text("storage_key").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		workspaceIdx: index("device_artifacts_workspace_id_idx").on(
			table.workspaceId,
		),
		expiresIdx: index("device_artifacts_expires_at_idx").on(table.expiresAt),
	}),
);

export const workspaceMembers = pgTable(
	"workspace_members",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		role: text("role").notNull().default("member"),

		createdAt: timestamp("created_at").defaultNow().notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => ({
		uniqueActiveMember: uniqueIndex("workspace_members_unique_active")
			.on(table.workspaceId, table.userId)
			.where(sql`${table.deletedAt} IS NULL`),

		workspaceIdx: index("workspace_members_workspace_id_idx").on(
			table.workspaceId,
		),
		userIdx: index("workspace_members_user_id_idx").on(table.userId),
	}),
);

export const workspaceInput = z.object({
	workspaceId: z.string(),
});
