export interface DashboardCompetitorData {
	name: string;
	domain: string;
	appearances: number;
	visibility?: number;
	avgSentiment: number;
	avgRank: number | null;
	recCount: number;
	isBrand?: boolean;
}

export interface DashboardSourceData {
	domain: string;
	favicon: string | null;
	citationCount: number;
	uniqueRecords: Set<string>;
	models: Set<string>;
}

/** One day of the GEO score trend. `count` is how many analyses backed the average. */
export interface DashboardTrendPoint {
	date: string;
	score: number;
	count: number;
}
