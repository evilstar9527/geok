import { clickhouse } from "@oneglanse/db";
import type {
	AnalysisRecord,
	BrandAnalysisResult,
	CollectionMetadata,
	PromptResponse,
} from "@oneglanse/types";

/**
 * Fetch ALL responses (analyzed and unanalyzed) with metadata
 */
export async function fetchAnalysedPrompts(args: {
	workspaceId: string;
	limit?: number;
}): Promise<AnalysisRecord[]> {
	const { workspaceId, limit = 10_000 } = args;

	// Query from prompt_responses (source of truth) and join analysis data
	const result = await clickhouse.query({
		query: `
            SELECT
                pr.id,
                pr.prompt_id,
                pr.prompt_run_at,
                pr.prompt,
                pr.user_id,
                pr.workspace_id,
                pr.model_provider,
                pr.run_id,
                pr.execution_surface,
                pr.device_id,
                pr.exposure_evaluated,
                pr.exposure_terms,
                pr.exposure_matches,
                pr.collection_metadata,
				pr.collection_status,
				pr.failure_reason,
                pr.response,
                pr.sources,
                pr.created_at,
                pr.is_analysed,
				if(notEmpty(pa_new.brand_analysis), pa_new.brand_analysis, pa_legacy.brand_analysis) as brand_analysis
            FROM analytics.prompt_responses pr
			ANY LEFT JOIN analytics.prompt_analysis pa_new
			  ON pr.id = pa_new.response_id
			ANY LEFT JOIN analytics.prompt_analysis pa_legacy
			  ON pa_legacy.response_id = ''
			  AND pr.prompt_id = pa_legacy.prompt_id
			  AND pr.prompt_run_at = pa_legacy.prompt_run_at
			  AND pr.model_provider = pa_legacy.model_provider
			  AND pr.workspace_id = pa_legacy.workspace_id
            WHERE pr.workspace_id = {workspaceId:String}
            ORDER BY pr.prompt_run_at DESC
            LIMIT {limit:UInt32}
        `,
		query_params: { workspaceId, limit },
		format: "JSONEachRow",
	});

	const rows = (await result.json()) as Array<
		PromptResponse & { brand_analysis?: string | BrandAnalysisResult }
	>;

	// Transform to flat array - handle both analyzed and unanalyzed
	const records: AnalysisRecord[] = rows.map((row) => {
		const parsedBrandAnalysis =
			row.brand_analysis &&
			row.brand_analysis !== "" &&
			row.brand_analysis !== "{}" &&
			row.brand_analysis !== "[]"
				? typeof row.brand_analysis === "string"
					? JSON.parse(row.brand_analysis)
					: row.brand_analysis
				: undefined;
		let parsedCollectionMetadata: CollectionMetadata | undefined;
		try {
			parsedCollectionMetadata =
				typeof row.collection_metadata === "string" &&
				row.collection_metadata !== "" &&
				row.collection_metadata !== "{}"
					? JSON.parse(row.collection_metadata)
					: undefined;
		} catch {
			parsedCollectionMetadata = undefined;
		}

		return {
			id: row.id,
			prompt_id: row.prompt_id,
			prompt: row.prompt,
			prompt_run_at: row.prompt_run_at,
			user_id: row.user_id,
			workspace_id: row.workspace_id,
			model_provider: row.model_provider,
			run_id: row.run_id ?? "",
			execution_surface: row.execution_surface ?? "web",
			device_id: row.device_id ?? null,
			exposure_evaluated: row.exposure_evaluated === true,
			exposure_terms: row.exposure_terms ?? [],
			exposure_matches: row.exposure_matches ?? [],
			collection_metadata: parsedCollectionMetadata,
			collection_status: row.collection_status ?? "success",
			failure_reason: row.failure_reason ?? null,
			response: row.response || "",
			sources: row.sources || [],
			brand_analysis: parsedBrandAnalysis,
			created_at: row.created_at,
			// ClickHouse ALTER UPDATE is asynchronous, so prompt_analysis may exist
			// before prompt_responses.is_analysed flips to true.
			is_analysed:
				row.is_analysed === true || parsedBrandAnalysis !== undefined,
		};
	});

	return records;
}

export async function getLastPromptRunTime(args: {
	workspaceId: string;
}): Promise<string | null> {
	const { workspaceId } = args;
	const result = await clickhouse.query({
		query: `
            SELECT toUnixTimestamp(MAX(prompt_run_at)) as last_run_ts
            FROM analytics.prompt_responses
            WHERE workspace_id = {workspaceId:String}
        `,
		query_params: { workspaceId },
		format: "JSONEachRow",
	});
	const data = (await result.json()) as Array<{ last_run_ts: number }>;
	if (data.length > 0 && data[0]?.last_run_ts && data[0].last_run_ts > 0) {
		return new Date(data[0].last_run_ts * 1000).toISOString();
	}
	return null;
}
