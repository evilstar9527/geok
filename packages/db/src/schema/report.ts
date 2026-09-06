import { index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace.js";

/**
 * A shareable, public GEO report snapshot. The full render payload lives in
 * `data` (JSON stringified ReportData) so the public page is self-contained
 * and never touches workspace/auth data.
 */
export const reports = pgTable(
	"reports",
	{
		id: varchar("id", { length: 128 }).primaryKey(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		brandName: varchar("brand_name", { length: 256 }).notNull(),
		brandDomain: varchar("brand_domain", { length: 256 }),
		data: text("data").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => ({
		workspaceIdx: index("reports_workspace_id_idx").on(table.workspaceId),
	}),
);
