import { db, schema } from "@oneglanse/db";
import type { ReportData } from "@oneglanse/types";
import { newId } from "@oneglanse/utils";

export async function createReport(args: {
	workspaceId: string;
	brandName: string;
	brandDomain: string | null;
	data: ReportData;
}): Promise<{ id: string }> {
	const { workspaceId, brandName, brandDomain, data } = args;
	const id = newId("report");

	await db.insert(schema.reports).values({
		id,
		workspaceId,
		brandName,
		brandDomain,
		data: JSON.stringify(data),
	});

	return { id };
}
