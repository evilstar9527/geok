import { clickhouse } from "@oneglanse/db";
import type {
	FetchPromptResponsesForWorkspaceArgs,
	PromptResponse,
} from "@oneglanse/types";

export async function fetchPromptResponsesForWorkspace(
	args: FetchPromptResponsesForWorkspaceArgs,
): Promise<PromptResponse[]> {
	const { workspaceId, startAt, endAt, modelProvider, promptId } = args;
	const filters = ["workspace_id = {workspaceId:String}"];
	const queryParams: Record<string, string> = { workspaceId };

	if (startAt) {
		filters.push("prompt_run_at >= parseDateTimeBestEffort({startAt:String})");
		queryParams.startAt = startAt;
	}
	if (endAt) {
		filters.push("prompt_run_at < parseDateTimeBestEffort({endAt:String})");
		queryParams.endAt = endAt;
	}
	if (modelProvider) {
		filters.push("model_provider = {modelProvider:String}");
		queryParams.modelProvider = modelProvider;
	}
	if (promptId) {
		filters.push("prompt_id = {promptId:String}");
		queryParams.promptId = promptId;
	}

	const result = await clickhouse.query({
		query: `
        SELECT *
        FROM analytics.prompt_responses
        WHERE ${filters.join(" AND ")}
      `,
		query_params: queryParams,
		format: "JSONEachRow",
	});

	const responses: PromptResponse[] = (await result.json()) as PromptResponse[];
	return responses;
}
