import { clickhouse, db, schema } from "@oneglanse/db";
import { and, eq, isNull } from "drizzle-orm";
import {
	type DashboardAnalysisRow,
	type DashboardResponseRow,
	buildPublicDashboard,
} from "./buildPublicDashboard.js";

export async function fetchPublicDashboard(workspaceId: string) {
	const [brand] = await db
		.select({ name: schema.workspaces.name, domain: schema.workspaces.domain })
		.from(schema.workspaces)
		.where(
			and(
				eq(schema.workspaces.id, workspaceId),
				isNull(schema.workspaces.deletedAt),
			),
		)
		.limit(1);
	if (!brand) return null;

	const [responses, analyses] = await Promise.all([
		clickhouse.query({
			query: `
				SELECT id, prompt_id, prompt, model_provider, response, sources,
					toString(toTimeZone(prompt_run_at, 'UTC')) AS run_utc
				FROM analytics.prompt_responses FINAL
				WHERE workspace_id = {workspaceId:String} AND collection_status = 'success'
			`,
			query_params: { workspaceId },
			format: "JSONEachRow",
		}),
		clickhouse.query({
			query: `
				SELECT id, response_id, prompt_id, model_provider, brand_analysis,
					toString(toTimeZone(prompt_run_at, 'UTC')) AS run_utc,
					toString(toTimeZone(created_at, 'UTC')) AS created_utc
				FROM analytics.prompt_analysis
				WHERE workspace_id = {workspaceId:String}
			`,
			query_params: { workspaceId },
			format: "JSONEachRow",
		}),
	]);
	return buildPublicDashboard(
		await responses.json<DashboardResponseRow>(),
		await analyses.json<DashboardAnalysisRow>(),
		brand,
	);
}
