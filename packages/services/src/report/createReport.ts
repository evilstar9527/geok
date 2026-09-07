import { db, schema } from "@oneglanse/db";
import type { ReportData } from "@oneglanse/types";
import { logger, newId } from "@oneglanse/utils";
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

	// Both LLM passes are nice-to-haves: a failure in either must not block the
	// report from being created. They are independent, so run them together.
	const [recommendations, gaps] = await Promise.all([
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
	]);

	data.recommendations = recommendations;
	data.gaps = gaps;

	await db.insert(schema.reports).values({
		id,
		workspaceId,
		brandName,
		brandDomain,
		data: JSON.stringify(data),
	});

	return { id };
}
