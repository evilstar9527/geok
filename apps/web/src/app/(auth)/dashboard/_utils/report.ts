import type {
	AnalysisRecord,
	ReportContactInfo,
	ReportData,
	ReportGap,
	ReportGapDirection,
	ReportMentionEntry,
	ReportModelEntry,
	ReportQuestionBreakdown,
	ReportQuote,
	ReportRankBucket,
	ReportRiskCounts,
	ReportSentimentBucket,
	ReportSourceChannel,
	ReportSourceEntry,
	ReportThemeCount,
} from "@oneglanse/types";
import { getDomain } from "@oneglanse/utils";
import type { DashboardMetrics } from "./types";

function pct(part: number, total: number): number {
	if (total <= 0) return 0;
	return Math.round((part / total) * 100);
}

/** Gap factor; null when the brand's baseline is zero (not comparable). */
function times(numerator: number, denominator: number): number | null {
	if (denominator <= 0) return null;
	const value = numerator / denominator;
	return Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
}

/**
 * Which side a comparison favours, from the raw numbers.
 * `higherIsBetter` is false for rank, where #2 beats #3.
 * Values within `tolerance` count as tied rather than a win or a loss.
 */
function direction(
	brandValue: number | null,
	competitorValue: number | null,
	higherIsBetter: boolean,
	tolerance = 0,
): ReportGapDirection {
	if (brandValue === null || competitorValue === null) return "neutral";
	const delta = brandValue - competitorValue;
	if (Math.abs(delta) <= tolerance) return "tied";
	const brandWins = higherIsBetter ? delta > 0 : delta < 0;
	return brandWins ? "ahead" : "behind";
}

/** Per-model mention + recommendation share, sorted by response volume. */
function computePerModelVisibility(
	records: AnalysisRecord[],
): ReportModelEntry[] {
	const map = new Map<
		string,
		{
			count: number;
			mentioned: number;
			recommended: number;
			sentimentSum: number;
			rankSum: number;
			rankCount: number;
		}
	>();

	for (const record of records) {
		const analysis = record.brand_analysis;
		const model = record.model_provider || "unknown";
		const entry = map.get(model) ?? {
			count: 0,
			mentioned: 0,
			recommended: 0,
			sentimentSum: 0,
			rankSum: 0,
			rankCount: 0,
		};
		entry.count++;
		if (analysis?.presence?.mentioned) entry.mentioned++;
		const rec = analysis?.recommendation?.type;
		if (rec === "top_pick" || rec === "strong_alternative") entry.recommended++;
		entry.sentimentSum += analysis?.sentiment?.score ?? 0;
		const rank = analysis?.position?.rankPosition ?? null;
		if (rank !== null) {
			entry.rankSum += rank;
			entry.rankCount++;
		}
		map.set(model, entry);
	}

	return [...map.entries()]
		.map(([model, entry]) => ({
			model,
			responseCount: entry.count,
			mentionRate: pct(entry.mentioned, entry.count),
			recommendationRate: pct(entry.recommended, entry.count),
			avgSentiment: Math.round(entry.sentimentSum / entry.count),
			avgRank:
				entry.rankCount > 0
					? Math.round(entry.rankSum / entry.rankCount)
					: null,
		}))
		.sort((a, b) => b.responseCount - a.responseCount);
}

/**
 * Reads risk items from a stored analysis. Rows written before the analysis output
 * was validated can hold `risks` as the items array itself rather than
 * `{ items: [...] }`, so accept both shapes.
 */
function readRiskItems(risks: unknown): { severity: string }[] {
	const items = Array.isArray(risks)
		? risks
		: (risks as { items?: unknown } | null | undefined)?.items;
	return Array.isArray(items) ? (items as { severity: string }[]) : [];
}

/** How often the brand landed 1st, 2nd, … 5th+ across the answers. */
function computeRankDistribution(
	records: AnalysisRecord[],
): ReportRankBucket[] {
	const counts = new Map<number, number>();
	for (const record of records) {
		const position = record.brand_analysis?.position?.rankPosition;
		if (position === null || position === undefined) continue;
		const bucket = Math.min(position, 5);
		counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
	}
	return [1, 2, 3, 4, 5].map((rank) => ({
		rank,
		count: counts.get(rank) ?? 0,
	}));
}

/** Per question-phrasing mention rate. */
function computeQuestionBreakdown(
	records: AnalysisRecord[],
): ReportQuestionBreakdown[] {
	const map = new Map<string, { count: number; mentioned: number }>();
	for (const record of records) {
		const prompt = record.prompt?.trim() || "(未记录)";
		const entry = map.get(prompt) ?? { count: 0, mentioned: 0 };
		entry.count++;
		if (record.brand_analysis?.presence?.mentioned) entry.mentioned++;
		map.set(prompt, entry);
	}
	return [...map.entries()]
		.map(([prompt, entry]) => ({
			prompt,
			responseCount: entry.count,
			mentionRate: pct(entry.mentioned, entry.count),
		}))
		.sort((a, b) => b.responseCount - a.responseCount);
}

const SENTIMENT_BUCKETS = [
	{ bucket: "0-20", min: 0, max: 20 },
	{ bucket: "21-40", min: 21, max: 40 },
	{ bucket: "41-59", min: 41, max: 59 },
	{ bucket: "60-80", min: 60, max: 80 },
	{ bucket: "81-100", min: 81, max: 100 },
] as const;

function computeSentimentDistribution(
	records: AnalysisRecord[],
): ReportSentimentBucket[] {
	const counts = new Map<string, number>();
	for (const bucket of SENTIMENT_BUCKETS) counts.set(bucket.bucket, 0);
	for (const record of records) {
		const score = record.brand_analysis?.sentiment?.score ?? 0;
		const bucket =
			SENTIMENT_BUCKETS.find((b) => score >= b.min && score <= b.max) ??
			SENTIMENT_BUCKETS[0];
		counts.set(bucket.bucket, (counts.get(bucket.bucket) ?? 0) + 1);
	}
	return SENTIMENT_BUCKETS.map((b) => ({
		bucket: b.bucket,
		count: counts.get(b.bucket) ?? 0,
	}));
}

/** Recurring positive claims, by frequency across answers. */
function computePositiveThemes(records: AnalysisRecord[]): ReportThemeCount[] {
	const counts = new Map<string, number>();
	for (const record of records) {
		for (const claim of record.brand_analysis?.perception?.coreClaims ?? []) {
			counts.set(claim, (counts.get(claim) ?? 0) + 1);
		}
	}
	return [...counts.entries()]
		.map(([theme, count]) => ({ theme, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 8);
}

function computeRiskCounts(records: AnalysisRecord[]): ReportRiskCounts {
	let critical = 0;
	let warning = 0;
	let info = 0;
	for (const record of records) {
		for (const item of readRiskItems(record.brand_analysis?.risks)) {
			if (item.severity === "critical") critical++;
			else if (item.severity === "warning") warning++;
			else info++;
		}
	}
	return { critical, warning, info };
}

const SENTENCE_SPLIT = /[。！？\n]+/;

/** Representative verbatim sentences mentioning the brand, tagged by tone. */
function computeVerbatimQuotes(
	records: AnalysisRecord[],
	brandName: string,
): ReportQuote[] {
	const quotes: ReportQuote[] = [];
	for (const record of records) {
		const response = record.response ?? "";
		const score = record.brand_analysis?.sentiment?.score ?? 50;
		const tone: ReportQuote["tone"] =
			score >= 60 ? "positive" : score <= 40 ? "negative" : "neutral";
		const sentences = response
			.split(SENTENCE_SPLIT)
			.map((s) => s.trim())
			.filter((s) => s.length >= 6);
		const hit = sentences.find((s) => s.includes(brandName));
		if (!hit) continue;
		quotes.push({
			text: hit.length > 140 ? `${hit.slice(0, 140)}…` : hit,
			model: record.model_provider || "unknown",
			tone,
		});
	}
	const order: Record<ReportQuote["tone"], number> = {
		negative: 0,
		positive: 1,
		neutral: 2,
	};
	return quotes.sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 8);
}

const PHONE_RE = /1[3-9]\d{9}/g;

/** Contact-info consistency: phone numbers AI attributed to the brand. */
function computeContactInfo(records: AnalysisRecord[]): ReportContactInfo {
	const phoneCounts = new Map<string, number>();
	let phoneCount = 0;
	let missingPhoneCount = 0;
	for (const record of records) {
		const phones = (record.response ?? "").match(PHONE_RE) ?? [];
		if (phones.length === 0) {
			missingPhoneCount++;
		} else {
			phoneCount++;
			for (const number of new Set(phones)) {
				phoneCounts.set(number, (phoneCounts.get(number) ?? 0) + 1);
			}
		}
	}
	return {
		phoneCount,
		missingPhoneCount,
		phones: [...phoneCounts.entries()]
			.map(([number, count]) => ({ number, count }))
			.sort((a, b) => b.count - a.count),
	};
}

/** Top cited source domains per model, for the source-channel section. */
function computeSourceChannels(
	records: AnalysisRecord[],
): ReportSourceChannel[] {
	const byModel = new Map<string, Map<string, number>>();
	for (const record of records) {
		const model = record.model_provider || "unknown";
		const domainCounts = byModel.get(model) ?? new Map<string, number>();
		for (const source of record.sources ?? []) {
			const domain =
				source.domain || (source.url ? getDomain(source.url) : null);
			if (!domain) continue;
			domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
		}
		byModel.set(model, domainCounts);
	}
	const out: ReportSourceChannel[] = [];
	for (const [model, domainCounts] of byModel) {
		for (const [domain, citationCount] of [...domainCounts.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)) {
			out.push({ model, domain, citationCount });
		}
	}
	return out;
}

/**
 * Builds the self-contained snapshot rendered by the public report page.
 * Compares the brand against its most-visible competitor across each metric;
 * the brand may lead, tie, or trail on any of them. Version 3 adds the
 * three-gate diagnostics computed directly from the per-response analysis.
 */
export function buildReportData(metrics: DashboardMetrics): ReportData {
	const total = metrics.impactMetrics.totalResponses;
	const competitors = metrics.competitorData.filter((c) => !c.isBrand);
	const brandEntry = metrics.competitorData.find((c) => c.isBrand);

	const brandName = metrics.brandName;
	const brandDomain = metrics.brandDomain || null;
	const brandMentionRate = metrics.aggregateStats.presenceRate;

	const mentionRates: ReportMentionEntry[] = [
		{
			name: brandName,
			domain: brandDomain,
			mentionRate: brandMentionRate,
			appearances: brandEntry?.appearances ?? 0,
			isBrand: true,
		},
		...competitors.map((c) => ({
			name: c.name,
			domain: c.domain || null,
			mentionRate: pct(c.appearances, total),
			appearances: c.appearances,
			isBrand: false,
		})),
	].sort((a, b) => b.mentionRate - a.mentionRate);

	// Leading competitor = highest mention rate (most visible rival).
	const leading = competitors.reduce<
		DashboardMetrics["competitorData"][number] | undefined
	>(
		(best, c) => (c.appearances > (best?.appearances ?? -1) ? c : best),
		undefined,
	);

	const gaps: ReportGap[] = [];

	if (leading) {
		const leadingMentionRate = pct(leading.appearances, total);
		const leadingRecRate = pct(leading.recCount, total);

		gaps.push({
			key: "mention",
			brandValue: brandMentionRate,
			competitorValue: leadingMentionRate,
			competitorName: leading.name,
			times: times(leadingMentionRate, brandMentionRate),
			// Rates are integer percentages; 1pt apart is noise, not a gap.
			direction: direction(brandMentionRate, leadingMentionRate, true, 1),
		});
		gaps.push({
			key: "recommendation",
			brandValue: metrics.impactMetrics.recommendationRate,
			competitorValue: leadingRecRate,
			competitorName: leading.name,
			times: times(leadingRecRate, metrics.impactMetrics.recommendationRate),
			direction: direction(
				metrics.impactMetrics.recommendationRate,
				leadingRecRate,
				true,
				1,
			),
		});
		gaps.push({
			key: "rank",
			brandValue: metrics.avgRank.position,
			competitorValue: leading.avgRank,
			competitorName: leading.name,
			// Lower rank is better, so a brand rank larger than the rival's is a deficit.
			times:
				metrics.avgRank.position !== null && leading.avgRank !== null
					? times(metrics.avgRank.position, leading.avgRank)
					: null,
			// Rank is inverted: #2 beats #3.
			direction: direction(
				metrics.avgRank.position,
				leading.avgRank,
				false,
				0.1,
			),
		});
		gaps.push({
			key: "sentiment",
			brandValue: metrics.avgSentiment.score,
			competitorValue: leading.avgSentiment,
			competitorName: leading.name,
			times: times(leading.avgSentiment, metrics.avgSentiment.score),
			direction: direction(
				metrics.avgSentiment.score,
				leading.avgSentiment,
				true,
				2,
			),
		});
	}

	gaps.push({
		key: "risk",
		brandValue: metrics.impactMetrics.criticalRiskCount,
		competitorValue: null,
		competitorName: "",
		times: null,
		// No competitor baseline: zero risks is good news, any risk is not.
		direction: metrics.impactMetrics.criticalRiskCount > 0 ? "behind" : "ahead",
	});

	const sourcesIntelligence: ReportSourceEntry[] = metrics.sourcesIntelligence
		.slice(0, 10)
		.map((source) => ({
			domain: source.domain,
			favicon: source.favicon,
			citationCount: source.citationCount,
			models: [...source.models],
		}));

	const records = metrics.analyzedRecords;

	return {
		version: 3,
		brand: { name: brandName, domain: brandDomain },
		generatedAt: new Date().toISOString(),
		totalResponses: total,
		mentionRates,
		gaps,
		brandPerception: metrics.brandPerception,
		sourcesIntelligence,
		perModelVisibility: computePerModelVisibility(records),
		rankDistribution: computeRankDistribution(records),
		questionBreakdown: computeQuestionBreakdown(records),
		sentimentDistribution: computeSentimentDistribution(records),
		positiveThemes: computePositiveThemes(records),
		riskCounts: computeRiskCounts(records),
		verbatimQuotes: computeVerbatimQuotes(records, brandName),
		contactInfo: computeContactInfo(records),
		sourceChannels: computeSourceChannels(records),
	};
}
