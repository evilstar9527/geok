import { db, schema } from "@oneglanse/db";
import { and, eq, isNull } from "drizzle-orm";
import { parsePdfReport } from "./pdfReport.js";

export async function listReportsByWorkspace(args: {
	workspaceId: string;
}) {
	const { workspaceId } = args;

	const reports = await db.query.reports.findMany({
		where: and(
			eq(schema.reports.workspaceId, workspaceId),
			isNull(schema.reports.deletedAt),
		),
		orderBy: (table, { desc }) => [desc(table.createdAt)],
	});
	return reports.map(({ data, ...report }) => {
		const pdf = parsePdfReport(data);
		return {
			...report,
			data: pdf
				? JSON.stringify({ kind: "pdf", version: 1, title: pdf.title })
				: data,
			kind: pdf ? ("pdf" as const) : ("snapshot" as const),
			title: pdf?.title ?? report.brandName,
		};
	});
}
