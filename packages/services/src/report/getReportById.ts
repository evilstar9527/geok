import { db, schema } from "@oneglanse/db";
import type { Report } from "@oneglanse/db";
import { and, eq, isNull } from "drizzle-orm";

export async function getReportById(args: {
	id: string;
}): Promise<Report | null> {
	const { id } = args;

	const report = await db.query.reports.findFirst({
		where: and(eq(schema.reports.id, id), isNull(schema.reports.deletedAt)),
	});

	return report ?? null;
}
