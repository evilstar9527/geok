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
	/** Average sentiment score the model gives the brand (0-100). v3+. */
	avgSentiment?: number;
	/** Average absolute rank the model assigns the brand. v3+. */
	avgRank?: number | null;
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

/** Brand rank-position histogram bucket. `rank` 5 means "5th or later". */
export interface ReportRankBucket {
	rank: number;
	count: number;
}

/** One question phrasing (prompt) and how often the brand was mentioned under it. */
export interface ReportQuestionBreakdown {
	prompt: string;
	responseCount: number;
	/** 0-100 share of this prompt's answers that mention the brand. */
	mentionRate: number;
}

/** One sentiment-score histogram bucket (e.g. "81-100"). */
export interface ReportSentimentBucket {
	bucket: string;
	count: number;
}

/** A recurring claim/theme with how many answers carry it. */
export interface ReportThemeCount {
	theme: string;
	count: number;
}

/** Counts of risk items by severity across all answers. */
export interface ReportRiskCounts {
	critical: number;
	warning: number;
	info: number;
}

/** A representative verbatim answer snippet mentioning the brand. */
export interface ReportQuote {
	text: string;
	model: string;
	tone: "positive" | "negative" | "neutral";
}

/** Contact-info consistency: the phone numbers AI attributed to the brand. */
export interface ReportContactInfo {
	/** Answers that gave at least one phone number. */
	phoneCount: number;
	/** Answers that gave none. */
	missingPhoneCount: number;
	phones: { number: string; count: number }[];
}

/** Per-model top cited source domain (source-channel section). */
export interface ReportSourceChannel {
	model: string;
	domain: string;
	citationCount: number;
}

/**
 * Self-contained snapshot rendered by the public /report/[id] page.
 * `version: 2` reports add the four enrichment sections (perception, sources,
 * per-model visibility, recommendations); `version: 3` adds the three-gate
 * diagnostics (rank/sentiment distributions, question breakdown, themes, quotes,
 * contact info, source channels) and the executive summary. Older versions
 * remain readable — every new field is optional.
 */
export interface ReportData {
	version: 1 | 2 | 3;
	brand: { name: string; domain: string | null };
	generatedAt: string;
	totalResponses: number;
	mentionRates: ReportMentionEntry[];
	gaps: ReportGap[];
	brandPerception?: ReportBrandPerception;
	sourcesIntelligence?: ReportSourceEntry[];
	perModelVisibility?: ReportModelEntry[];
	recommendations?: ReportRecommendation[];
	rankDistribution?: ReportRankBucket[];
	questionBreakdown?: ReportQuestionBreakdown[];
	sentimentDistribution?: ReportSentimentBucket[];
	positiveThemes?: ReportThemeCount[];
	riskCounts?: ReportRiskCounts;
	verbatimQuotes?: ReportQuote[];
	contactInfo?: ReportContactInfo;
	sourceChannels?: ReportSourceChannel[];
	executiveSummary?: string;
}
