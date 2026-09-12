import type { AnalysisRecord } from "@oneglanse/types";
import type {
	DashboardCompetitorData as CompetitorData,
	DashboardSourceData as SourceData,
	DashboardTrendPoint as TrendPoint,
} from "@oneglanse/ui";

export type { CompetitorData, SourceData, TrendPoint };

/** Aggregates over the window immediately preceding the selected one. */
export interface PreviousPeriodStats {
	presenceRate: number;
	rank: number | null;
}

export interface DashboardMetrics {
	brandName: string;
	brandDomain: string;
	avgRank: { position: number | null };
	avgSentiment: { score: number };
	impactMetrics: {
		totalResponses: number;
		avgVisibility: number;
		recommendationRate: number;
		topPickRate: number;
		criticalRiskCount: number;
	};
	aggregateStats: {
		presenceRate: number;
		topCompetitor: string;
		topCompetitorDomain: string | null;
	};
	competitorData: CompetitorData[];
	brandPerception: {
		bestKnownFor: string | null;
		pricingPerception: string;
		coreClaims: string[];
		differentiators: string[];
	};
	sourcesIntelligence: SourceData[];
	totalCitations: number;
	analyzedRecords: AnalysisRecord[];
	trend: TrendPoint[];
	previousPeriod: PreviousPeriodStats | null;
}
