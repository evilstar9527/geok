import { db, schema } from "@oneglanse/db";
import type { PrArticleData } from "@oneglanse/types";

/**
 * Scoped by workspace as well as id: a draft id alone must never be enough to
 * read another workspace's draft.
 */
export async function getPrArticleById(args: {
	workspaceId: string;
	id: string;
}): Promise<PrArticleData | null> {
	const row = await db.query.prArticles.findFirst({
		where: (table, { and, eq, isNull }) =>
			and(
				eq(table.id, args.id),
				eq(table.workspaceId, args.workspaceId),
				isNull(table.deletedAt),
			),
	});
	if (!row) return null;

	return JSON.parse(row.data) as PrArticleData;
}
