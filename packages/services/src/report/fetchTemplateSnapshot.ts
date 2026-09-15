import { clickhouse } from "@oneglanse/db";
import {
	buildTemplateSnapshot,
	type TemplateResponseRow,
} from "./buildTemplateSnapshot.js";

export async function fetchTemplateSnapshot(
	workspaceId: string,
	brand: { name: string; domain: string | null },
) {
	const result = await clickhouse.query({
		query: `
			SELECT pr.id, pr.prompt, pr.model_provider, pr.response, pr.sources,
				toString(toTimeZone(pr.prompt_run_at, 'UTC')) AS run_utc,
				pa.brand_analysis AS brand_analysis
			FROM (SELECT * FROM analytics.prompt_responses FINAL WHERE workspace_id = {workspaceId:String}) pr
			LEFT JOIN (
				SELECT workspace_id, prompt_id, model_provider, prompt_run_at,
					argMax(brand_analysis, created_at) AS brand_analysis
				FROM analytics.prompt_analysis
				WHERE workspace_id = {workspaceId:String}
				GROUP BY workspace_id, prompt_id, model_provider, prompt_run_at
			) pa ON pr.workspace_id = pa.workspace_id AND pr.prompt_id = pa.prompt_id
				AND pr.model_provider = pa.model_provider AND pr.prompt_run_at = pa.prompt_run_at
			ORDER BY pr.prompt_run_at, pr.id
		`,
		query_params: { workspaceId },
		format: "JSONEachRow",
	});
	return buildTemplateSnapshot(await result.json<TemplateResponseRow>(), brand);
}
