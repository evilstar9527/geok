import type { BrandAnalysisResult, CollectionMetadata } from "@oneglanse/types";

/** Use captured query intent; response mentions cannot determine query type. */
export function capturedPromptGroup(
	metadata: unknown,
): CollectionMetadata["promptGroup"] {
	try {
		const value =
			typeof metadata === "string" ? JSON.parse(metadata) : metadata;
		const group =
			typeof value === "object" && value !== null && "promptGroup" in value
				? value.promptGroup
				: undefined;
		return group === "brand" || group === "category" ? group : undefined;
	} catch {
		return undefined;
	}
}

/** Also masks historical ranks when a brand query is read, without rewriting it. */
export function applyQueryIntent(
	analysis: BrandAnalysisResult,
	group: CollectionMetadata["promptGroup"],
): BrandAnalysisResult {
	if (group !== "brand") return analysis;
	return {
		...analysis,
		position: { rankPosition: null },
		competitors: (analysis.competitors ?? []).map((competitor) => ({
			...competitor,
			rankPosition: null,
		})),
	};
}
