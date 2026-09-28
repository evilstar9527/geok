import { index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { workspaces } from "./workspace.js";

/**
 * A brand PR article drafted from one prompt's citation sources.
 *
 * The render payload lives in `data` (JSON stringified PrArticleData) so the
 * detail view and the exporters read one self-contained row. `promptId` and
 * `promptText` are snapshots: the source prompt can be renamed or deleted in
 * ClickHouse, and a stored draft must stay readable afterwards.
 */
export const prArticles = pgTable(
	"pr_articles",
	{
		id: varchar("id", { length: 128 }).primaryKey(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		promptId: varchar("prompt_id", { length: 256 }).notNull(),
		promptText: text("prompt_text").notNull(),
		title: varchar("title", { length: 512 }).notNull(),
		data: text("data").notNull(),
		createdBy: text("created_by").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => ({
		workspaceIdx: index("pr_articles_workspace_id_idx").on(table.workspaceId),
		promptIdx: index("pr_articles_prompt_id_idx").on(table.promptId),
	}),
);
