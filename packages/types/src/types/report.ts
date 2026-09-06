/** One row in the mention-rate comparison bar chart (brand + competitors). */
export interface ReportMentionEntry {
	name: string;
	domain: string | null;
	/** 0-100 share of analyzed responses that mention this entity. */
	mentionRate: number;
	/** Raw count of responses that mention this entity. */
	appearances: number;
	isBrand: boolean;
}

export type ReportGapKey =
	| "mention"
	| "recommendation"
	| "rank"
	| "sentiment"
	| "risk";

/**
 * A single "where the brand trails the leading competitor" finding.
 * Higher `times` = a wider gap to dramatize in the report.
 */
export interface ReportGap {
	key: ReportGapKey;
	/** Brand value for the metric (rank: lower is better). */
	brandValue: number | null;
	/** Leading competitor's value for the metric. */
	competitorValue: number | null;
	competitorName: string;
	/** Gap factor (competitor / brand, or brand / competitor for rank). Null when not comparable. */
	times: number | null;
}

/** Self-contained snapshot rendered by the public /report/[id] page. */
export interface ReportData {
	version: 1;
	brand: { name: string; domain: string | null };
	generatedAt: string;
	totalResponses: number;
	mentionRates: ReportMentionEntry[];
	gaps: ReportGap[];
}
