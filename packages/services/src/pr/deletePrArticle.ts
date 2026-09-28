import { db, schema } from "@oneglanse/db";
import { and, eq, isNull } from "drizzle-orm";

export async function deletePrArticle(args: {
	workspaceId: string;
	id: string;
}): Promise<boolean> {
	const [deleted] = await db
		.update(schema.prArticles)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(schema.prArticles.id, args.id),
				eq(schema.prArticles.workspaceId, args.workspaceId),
				isNull(schema.prArticles.deletedAt),
			),
		)
		.returning({ id: schema.prArticles.id });

	return Boolean(deleted);
}
