import type {
	ReportData,
	ReportGap,
	ReportMentionEntry,
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
 * Builds the self-contained snapshot rendered by the public report page.
 * Focuses on mention-rate comparison (brand vs competitors) and the brand's
 * trailing gaps against its leading competitor.
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
		});
		gaps.push({
			key: "recommendation",
			brandValue: metrics.impactMetrics.recommendationRate,
			competitorValue: leadingRecRate,
			competitorName: leading.name,
			times: times(leadingRecRate, metrics.impactMetrics.recommendationRate),
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
		});
		gaps.push({
			key: "sentiment",
			brandValue: metrics.avgSentiment.score,
			competitorValue: leading.avgSentiment,
			competitorName: leading.name,
			times: times(leading.avgSentiment, metrics.avgSentiment.score),
		});
	}

	gaps.push({
		key: "risk",
		brandValue: metrics.impactMetrics.criticalRiskCount,
		competitorValue: null,
		competitorName: "",
		times: null,
	});

	return {
		version: 1,
		brand: { name: brandName, domain: brandDomain },
		generatedAt: new Date().toISOString(),
		totalResponses: total,
		mentionRates,
		gaps,
	};
}
