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
 * How the brand stands against the leading competitor on one metric.
 * Computed from the raw numbers, never inferred by an LLM, so the report
 * cannot claim the brand trails on a metric where it actually leads.
 */
export type ReportGapDirection = "ahead" | "tied" | "behind" | "neutral";

/**
 * A single metric comparison against the leading competitor. The brand may be
 * ahead, tied, or behind — `direction` says which.
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
	/**
	 * Which side the comparison favours, computed from the numbers. `neutral`
	 * covers metrics with no competitor baseline (risk) or missing data.
	 * Optional so reports stored before this field still parse.
	 */
	direction?: ReportGapDirection;
	/** Data-grounded headline for this metric, written per report. */
	headline?: string;
	/** One-sentence reading of what these numbers mean. */
	insight?: string;
}

/** What AI models collectively say the brand is known for. */
export interface ReportBrandPerception {
	bestKnownFor: string | null;
	pricingPerception: string;
	coreClaims: string[];
	differentiators: string[];
}

/** One cited source (publisher domain) and the models that cite it. */
export interface ReportSourceEntry {
	domain: string;
	favicon: string | null;
	citationCount: number;
	models: string[];
}

/** Per-model visibility for the brand (mention + recommendation share). */
export interface ReportModelEntry {
	model: string;
	responseCount: number;
	mentionRate: number;
	recommendationRate: number;
}

export type ReportRecommendationPriority = "high" | "medium" | "low";

/** A single actionable GEO recommendation ("做什么 / 为什么 / 怎么做 / 怎么衡量"). */
export interface ReportRecommendation {
	priority: ReportRecommendationPriority;
	title: string;
	rationale: string;
	action: string;
	kpi: string;
}

/**
 * Self-contained snapshot rendered by the public /report/[id] page.
 * `version: 2` reports add the four enrichment sections below; v1 reports
 * (mention rates + gaps only) remain readable.
 */
export interface ReportData {
	version: 1 | 2;
	brand: { name: string; domain: string | null };
	generatedAt: string;
	totalResponses: number;
	mentionRates: ReportMentionEntry[];
	gaps: ReportGap[];
	brandPerception?: ReportBrandPerception;
	sourcesIntelligence?: ReportSourceEntry[];
	perModelVisibility?: ReportModelEntry[];
	recommendations?: ReportRecommendation[];
}
