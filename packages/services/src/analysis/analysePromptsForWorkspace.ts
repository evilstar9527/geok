import { clickhouse } from "@oneglanse/db";
import { toErrorMessage } from "@oneglanse/errors";
import type {
	BrandAnalysisResult,
	PromptAnalysis,
	PromptResponse,
} from "@oneglanse/types";
import { v4 as uuidv4 } from "uuid";
import { getWorkspaceById } from "../workspace/index.js";
import { runAnalysis } from "./runAnalysis.js";

async function analysePromptResponse(args: {
	workspaceId: string;
	response: string;
	prompt: string;
	promptId?: string;
}): Promise<BrandAnalysisResult> {
	const { workspaceId, response, prompt, promptId } = args;

	const workspace = await getWorkspaceById({ workspaceId });

	const result = await runAnalysis({
		brandDomain: workspace.domain,
		brandName: workspace.name,
		response,
		prompt,
	});

	result.metadata = {
		brandName: workspace.name,
		brandDomain: workspace.domain,
	};

	return result;
}

export async function analysePromptsForWorkspace(args: {
	workspaceId: string;
	batchSize?: number;
	analyzeAll?: boolean;
	runId?: string;
	modelProvider?: string;
}): Promise<{
	analysedCount: number;
	failedCount: number;
	errors: Array<{ responseId: string; modelProvider: string; error: string }>;
	remainingCount: number;
}> {
	const {
		workspaceId,
		batchSize = 50,
		analyzeAll = false,
		runId,
		modelProvider,
	} = args;
	const scopeFilters = [
		...(runId ? ["pr.run_id = {runId:String}"] : []),
		...(modelProvider ? ["pr.model_provider = {modelProvider:String}"] : []),
	];
	const scopeSql = scopeFilters.length
		? `AND ${scopeFilters.join(" AND ")}`
		: "";
	const queryParams = {
		workspaceId,
		batchSize,
		...(runId ? { runId } : {}),
		...(modelProvider ? { modelProvider } : {}),
	};

	let totalAnalyzed = 0;
	let totalFailed = 0;
	let allErrors: Array<{
		responseId: string;
		modelProvider: string;
		error: string;
	}> = [];

	let hasMore = true;
	while (hasMore) {
		const result = await clickhouse.query({
			query: `
                SELECT pr.*
                FROM analytics.prompt_responses pr
                LEFT JOIN (
                    SELECT response_id
                    FROM analytics.prompt_analysis
                    WHERE response_id != ''
                ) pa ON pr.id = pa.response_id
                WHERE pr.workspace_id = {workspaceId:String}
                  AND pr.is_analysed = false
                  AND pr.collection_status = 'success'
                  AND length(pr.response) > 0
                  AND pa.response_id = ''
                  ${scopeSql}
                LIMIT {batchSize:UInt32}
            `,
			query_params: queryParams,
			format: "JSONEachRow",
		});

		const responses: PromptResponse[] = await result.json();

		if (responses.length === 0) {
			break;
		}

		const analysisRows: PromptAnalysis[] = [];
		const responseIdsToMark: string[] = [];
		const errors: Array<{
			responseId: string;
			modelProvider: string;
			error: string;
		}> = [];

		// Analyze each response
		for (const resp of responses) {
			try {
				const analysisResult = await analysePromptResponse({
					workspaceId: resp.workspace_id,
					response: resp.response,
					prompt: resp.prompt,
					promptId: resp.prompt_id,
				});

				analysisRows.push({
					id: uuidv4(),
					response_id: resp.id,
					prompt_id: resp.prompt_id,
					workspace_id: resp.workspace_id,
					prompt: resp.prompt,
					user_id: resp.user_id,
					model_provider: resp.model_provider,
					brand_analysis: JSON.stringify(analysisResult),
					prompt_run_at: resp.prompt_run_at,
					created_at: resp.created_at,
				});

				responseIdsToMark.push(resp.id);
			} catch (err) {
				const errorMessage = toErrorMessage(err);
				console.error(
					`Failed to analyze response ${resp.id} (${resp.model_provider}):`,
					errorMessage,
				);

				// Collect error details for frontend
				errors.push({
					responseId: resp.id,
					modelProvider: resp.model_provider,
					error: errorMessage,
				});
			}
		}

		if (analysisRows.length > 0) {
			await clickhouse.insert({
				table: "analytics.prompt_analysis",
				values: analysisRows,
				format: "JSONEachRow",
			});
		}

		if (responseIdsToMark.length > 0) {
			await clickhouse.command({
				query: `
                    ALTER TABLE analytics.prompt_responses
                    UPDATE is_analysed = true
                    WHERE id IN ({ids:Array(String)})
                `,
				query_params: { ids: responseIdsToMark },
			});
		}

		totalAnalyzed += analysisRows.length;
		totalFailed += errors.length;
		allErrors = allErrors.concat(errors);
		// If not analyzing all, stop after first batch
		if (!analyzeAll) {
			hasMore = false;
		} else {
			// Inserts are immediately queryable, so the response_id join prevents
			// selecting successful rows again while ALTER UPDATE catches up.
			hasMore = responses.length === batchSize && analysisRows.length > 0;
		}
	}

	// Check remaining count
	const remainingResult = await clickhouse.query({
		query: `
            SELECT count() as count
			FROM analytics.prompt_responses pr
			LEFT JOIN (
				SELECT response_id
				FROM analytics.prompt_analysis
				WHERE response_id != ''
			) pa ON pr.id = pa.response_id
			WHERE pr.workspace_id = {workspaceId:String}
			  AND pr.is_analysed = false
			  AND pr.collection_status = 'success'
			  AND length(pr.response) > 0
			  AND pa.response_id = ''
			  ${scopeSql}
        `,
		query_params: queryParams,
		format: "JSONEachRow",
	});

	const remainingData: Array<{ count: string }> = await remainingResult.json();
	const remainingCount = Number(remainingData[0]?.count || 0);

	return {
		analysedCount: totalAnalyzed,
		failedCount: totalFailed,
		errors: allErrors,
		remainingCount,
	};
}
