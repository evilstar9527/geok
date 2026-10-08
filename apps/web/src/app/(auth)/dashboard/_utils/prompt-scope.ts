import type { AnalysisRecord } from "@oneglanse/types";

export type PromptScope = "category" | "brand" | "unclassified" | "all";

/** Classify by captured intent, never by whether the answer mentions the brand. */
export function getPromptScope(
	record: AnalysisRecord,
): Exclude<PromptScope, "all"> {
	const group = record.collection_metadata?.promptGroup;
	return group === "category" || group === "brand" ? group : "unclassified";
}

export function resolvePromptScope(
	value: string | null,
	records: AnalysisRecord[],
): PromptScope {
	if (
		value === "category" ||
		value === "brand" ||
		value === "unclassified" ||
		value === "all"
	)
		return value;
	return records.some((record) => getPromptScope(record) === "category")
		? "category"
		: "all";
}

/** Scope before aggregating, retaining repeated samples and pending analysis. */
export function filterPromptScope(
	records: AnalysisRecord[],
	scope: PromptScope,
): AnalysisRecord[] {
	return scope === "all"
		? records
		: records.filter((record) => getPromptScope(record) === scope);
}

export function summarizePromptScope(records: AnalysisRecord[]) {
	const analyzed = records.filter(
		(record) => record.is_analysed && record.brand_analysis,
	);
	const mentions = analyzed.filter(
		(record) => record.brand_analysis?.presence?.mentioned,
	).length;
	return {
		collected: records.length,
		analyzed: analyzed.length,
		mentions,
		mentionRate: analyzed.length ? (mentions / analyzed.length) * 100 : null,
	};
}
