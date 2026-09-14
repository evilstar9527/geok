import { toErrorMessage } from "@oneglanse/errors";
import type {
	ModelResult,
	Provider,
	Source,
	StorePromptResponsesArgs,
} from "@oneglanse/types";
import { evaluateExposure, formatDateToClickHouse } from "@oneglanse/utils";
import { v4 as uuidv4 } from "uuid";
import { insertClickHouseWithFallback } from "./lib/insertClickHouseWithFallback.js";

export async function storePromptResponses(
	args: StorePromptResponsesArgs,
): Promise<void> {
	const { results, userId, workspaceId, promptRunAt, runId, exposureTerms } =
		args;

	const values: Array<{
		id: string;
		response_sort_id: string;
		prompt_id: string;
		prompt: string;
		user_id: string;
		workspace_id: string;
		model: string;
		model_provider: string;
		response: string;
		sources: Source[];
		prompt_run_at: string;
		run_id: string;
		execution_surface: string;
		device_id: string | null;
		exposure_evaluated: boolean;
		exposure_terms: string[];
		exposure_matches: string[];
		collection_metadata: string;
		collection_status: string;
		failure_reason: string | null;
	}> = [];

	for (const [provider, result] of Object.entries(results) as [
		Provider,
		ModelResult[Provider],
	][]) {
		if (result.status !== "fulfilled") continue;

		for (const item of result.data) {
			const responseId = uuidv4();
			const exposure =
				item.collection?.status === "failed"
					? { evaluated: false, terms: exposureTerms ?? [], matches: [] }
					: item.collection?.exposureEvaluated
						? {
								evaluated: true,
								terms: item.collection.exposureTerms,
								matches: item.collection.exposureMatches,
							}
						: evaluateExposure(item.response, exposureTerms ?? []);
			const collection = item.collection;
			values.push({
				id: responseId,
				response_sort_id: responseId,
				prompt_id: item.promptId,
				prompt: item.prompt,
				user_id: userId,
				workspace_id: workspaceId,
				model: provider,
				model_provider: provider,
				response: item.response,
				sources: item.sources.map((s) => ({
					title: s.title ?? "",
					cited_text: s.cited_text ?? "",
					url: s.url ?? "",
					domain: s.domain ?? null,
					favicon: s.favicon ?? null,
				})),
				prompt_run_at: formatDateToClickHouse(new Date(promptRunAt)),
				run_id: collection?.runId ?? runId ?? "",
				execution_surface: collection?.surface ?? "web",
				device_id: collection?.deviceId ?? null,
				exposure_evaluated: exposure.evaluated,
				exposure_terms: exposure.terms,
				exposure_matches: exposure.matches,
				collection_metadata: JSON.stringify(collection ?? {}),
				collection_status: collection?.status ?? "success",
				failure_reason: collection?.failureReason ?? null,
			});
		}
	}

	if (values.length === 0) return;

	await insertClickHouseWithFallback("analytics.prompt_responses", values, {
		throwOnAllFailed: true,
		onRecordFailed: (value, err) => {
			console.error(
				`Failed to insert record (prompt: "${value.prompt.slice(0, 50)}..."):`,
				toErrorMessage(err),
			);
			console.error("Problematic data:", {
				id: value.id,
				prompt_id: value.prompt_id,
				prompt: value.prompt.slice(0, 100),
				prompt_run_at: value.prompt_run_at,
				response_length: value.response.length,
				sources_count: value.sources.length,
			});
		},
	});
}
