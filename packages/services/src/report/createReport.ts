import { db, schema } from "@oneglanse/db";
import type { ReportData } from "@oneglanse/types";
import { logger, newId } from "@oneglanse/utils";
import { fetchTemplateSnapshot } from "./fetchTemplateSnapshot.js";
import { generateExecutiveSummary } from "./generateExecutiveSummary.js";
import { generateGapNarratives } from "./generateGapNarratives.js";
import { generateRecommendations } from "./generateRecommendations.js";

export async function createReport(args: {
	workspaceId: string;
	brandName: string;
	brandDomain: string | null;
	data: ReportData;
}): Promise<{ id: string }> {
	const { workspaceId } = args;
	const workspace = await db.query.workspaces.findFirst({
		where: (table, { and, eq, isNull }) =>
			and(eq(table.id, workspaceId), isNull(table.deletedAt)),
	});
	if (!workspace) throw new Error("Workspace not found");
	const brandName = workspace.name;
	const brandDomain = workspace.domain;
	const brand = { name: brandName, domain: brandDomain };
	const templateSnapshot = await fetchTemplateSnapshot(workspaceId, brand);
	if (templateSnapshot.analysed === 0)
		throw new Error("No analysed responses available");
	const data: ReportData = {
		...args.data,
		brand,
		generatedAt: templateSnapshot.generatedAt,
		templateSnapshot,
	};
	const id = newId("report");

	// All three LLM passes are nice-to-haves: a failure in any must not block the
	// report from being created. They are independent, so run them together.
	//
	// Every fallback is also recorded on the report. Logging alone was not enough:
	// a report stored without an executive summary is byte-for-byte identical to
	// one where the model legitimately returned an empty string, so a degraded
	// report could reach a client with nothing marking it as incomplete.
	const unavailableSections: string[] = [];
	const onPassFailed = (section: string, err: unknown) => {
		unavailableSections.push(section);
		logger.error(
			`Report ${section} generation failed — storing the report without it.`,
			err,
		);
	};

	const [recommendations, gaps, summary] = await Promise.all([
		generateRecommendations(data).catch((err) => {
			onPassFailed("recommendations", err);
			return [];
		}),
		generateGapNarratives(data).catch((err) => {
			onPassFailed("gap narratives", err);
			return data.gaps;
		}),
		generateExecutiveSummary(data).catch((err) => {
			onPassFailed("executive summary", err);
			return "";
		}),
	]);

	data.recommendations = recommendations;
	data.gaps = gaps;
	if (summary) data.executiveSummary = summary;
	if (unavailableSections.length > 0) {
		data.unavailableSections = unavailableSections;
	}

	await db.insert(schema.reports).values({
		id,
		workspaceId,
		brandName,
		brandDomain,
		data: JSON.stringify(data),
	});

	return { id };
}
