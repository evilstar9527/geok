import type {
	AnalysisRecord,
	ReportData,
	ReportGap,
	ReportGapDirection,
	ReportMentionEntry,
	ReportModelEntry,
	ReportSourceEntry,
} from "@oneglanse/types";
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
		{ count: number; mentioned: number; recommended: number }
	>();

	for (const record of records) {
		const model = record.model_provider || "unknown";
		const entry = map.get(model) ?? { count: 0, mentioned: 0, recommended: 0 };
		entry.count++;
		if (record.brand_analysis?.presence?.mentioned) entry.mentioned++;
		const rec = record.brand_analysis?.recommendation?.type;
		if (rec === "top_pick" || rec === "strong_alternative") entry.recommended++;
		map.set(model, entry);
	}

	return [...map.entries()]
		.map(([model, entry]) => ({
			model,
			responseCount: entry.count,
			mentionRate: pct(entry.mentioned, entry.count),
			recommendationRate: pct(entry.recommended, entry.count),
		}))
		.sort((a, b) => b.responseCount - a.responseCount);
}

/**
 * Builds the self-contained snapshot rendered by the public report page.
 * Compares the brand against its most-visible competitor across each metric;
 * the brand may lead, tie, or trail on any of them.
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

	return {
		version: 2,
		brand: { name: brandName, domain: brandDomain },
		generatedAt: new Date().toISOString(),
		totalResponses: total,
		mentionRates,
		gaps,
		brandPerception: metrics.brandPerception,
		sourcesIntelligence,
		perModelVisibility: computePerModelVisibility(metrics.analyzedRecords),
	};
}
