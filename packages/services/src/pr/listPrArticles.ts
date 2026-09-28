import { db, schema } from "@oneglanse/db";
import type { PrArticleListItem } from "@oneglanse/types";
import { and, desc, eq, isNull } from "drizzle-orm";

export async function listPrArticles(args: {
	workspaceId: string;
}): Promise<PrArticleListItem[]> {
	return db
		.select({
			id: schema.prArticles.id,
			promptId: schema.prArticles.promptId,
			promptText: schema.prArticles.promptText,
			title: schema.prArticles.title,
			createdAt: schema.prArticles.createdAt,
		})
		.from(schema.prArticles)
		.where(
			and(
				eq(schema.prArticles.workspaceId, args.workspaceId),
				isNull(schema.prArticles.deletedAt),
			),
		)
		.orderBy(desc(schema.prArticles.createdAt));
}
