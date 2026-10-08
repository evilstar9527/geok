import type {
	FetchPromptSourcesForWorkspaceArgs,
	FetchPromptSourcesForWorkspaceResult,
} from "@oneglanse/types";
import { extractDomainStats, extractSourceStats } from "@oneglanse/utils";
import { fetchPromptResponsesForWorkspace } from "./fetchPromptResponsesForWorkspace.js";

import { summarizeSourceCoverage } from "./sourceCoverage.js";

export async function fetchPromptSourcesForWorkspace(
	args: FetchPromptSourcesForWorkspaceArgs,
): Promise<FetchPromptSourcesForWorkspaceResult> {
	const { workspaceId, startAt, endAt, modelProvider, promptId } = args;

	const promptResponses = await fetchPromptResponsesForWorkspace({
		workspaceId,
		startAt,
		endAt,
		modelProvider,
		promptId,
	});
	const domainStats = extractDomainStats(promptResponses);
	const sourceStats = extractSourceStats(promptResponses);

	return {
		domain_stats: domainStats,
		sourceStats,
		responseCount: promptResponses.length,
		sourceCoverage: summarizeSourceCoverage(promptResponses),
		respondedProviders: [
			...new Set(promptResponses.map((response) => response.model_provider)),
		],
	};
}
