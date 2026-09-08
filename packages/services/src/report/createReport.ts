import { db, schema } from "@oneglanse/db";
import type { ReportData } from "@oneglanse/types";
import { logger, newId } from "@oneglanse/utils";
import { generateExecutiveSummary } from "./generateExecutiveSummary.js";
import { generateGapNarratives } from "./generateGapNarratives.js";
import { generateRecommendations } from "./generateRecommendations.js";

export async function createReport(args: {
	workspaceId: string;
	brandName: string;
	brandDomain: string | null;
	data: ReportData;
}): Promise<{ id: string }> {
	const { workspaceId, brandName, brandDomain } = args;
	const data: ReportData = { ...args.data };
	const id = newId("report");

	// All three LLM passes are nice-to-haves: a failure in any must not block the
	// report from being created. They are independent, so run them together.
	const [recommendations, gaps, summary] = await Promise.all([
		generateRecommendations(data).catch((err) => {
			logger.warn(
				"Report recommendation generation failed — storing report without recommendations.",
				err,
			);
			return [];
		}),
		generateGapNarratives(data).catch((err) => {
			logger.warn(
				"Gap narrative generation failed — falling back to numeric descriptions.",
				err,
			);
			return data.gaps;
		}),
		generateExecutiveSummary(data).catch((err) => {
			logger.warn(
				"Executive summary generation failed — storing report without a summary.",
				err,
			);
			return "";
		}),
	]);

	data.recommendations = recommendations;
	data.gaps = gaps;
	if (summary) data.executiveSummary = summary;

	await db.insert(schema.reports).values({
		id,
		workspaceId,
		brandName,
		brandDomain,
		data: JSON.stringify(data),
	});

	return { id };
}
