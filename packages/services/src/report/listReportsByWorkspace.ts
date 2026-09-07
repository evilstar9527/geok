import { db, schema } from "@oneglanse/db";
import type { Report } from "@oneglanse/db";
import { and, eq, isNull } from "drizzle-orm";

export async function listReportsByWorkspace(args: {
	workspaceId: string;
}): Promise<Report[]> {
	const { workspaceId } = args;

	return db.query.reports.findMany({
		where: and(
			eq(schema.reports.workspaceId, workspaceId),
			isNull(schema.reports.deletedAt),
		),
		orderBy: (table, { desc }) => [desc(table.createdAt)],
	});
}
