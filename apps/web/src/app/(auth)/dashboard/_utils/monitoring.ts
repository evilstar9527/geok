import type { AnalysisRecord } from "@oneglanse/types";

/**
 * Per-brand rates for the monitoring pages.
 *
 * Every rate is a share of *all* analysed responses in the window, not of the
 * responses that mentioned the brand — so positive and negative shares do not
 * add up to 100%, matching how the monitoring metrics are defined.
 */
export interface BrandRates {
	name: string;
	isSelf: boolean;
	mentionRate: number;
	firstRate: number;
	top3Rate: number;
	top6Rate: number;
	positiveRate: number;
	negativeRate: number;
}

/** The rate a trend or leaderboard is keyed on. */
export type RateKey = keyof Omit<BrandRates, "name" | "isSelf">;

export interface TrendData {
	categories: string[];
	series: { name: string; values: (number | null)[] }[];
}

/** Sentiment scores are 0-100; these bounds mirror the dashboard's own split. */
const POSITIVE_THRESHOLD = 60;
const NEGATIVE_THRESHOLD = 40;

interface Observation {
	mentioned: boolean;
	rank: number | null;
	sentiment: number | null;
}

interface Tally {
	mentions: number;
	first: number;
	top3: number;
	top6: number;
	positive: number;
	negative: number;
}

const emptyTally = (): Tally => ({
	mentions: 0,
	first: 0,
	top3: 0,
	top6: 0,
	positive: 0,
	negative: 0,
});

/** Local calendar day, matching the buckets `useDashboardData` builds. */
function toDayKey(value: string): string | null {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

/** "2026-09-21" -> "09-21", the axis label the trend panels use. */
export function toAxisLabel(dayKey: string): string {
	return dayKey.slice(5);
}

/** Only analysed records carry metrics; unanalysed ones are not neutral data. */
function isAnalysed(record: AnalysisRecord): boolean {
	return record.is_analysed === true && !!record.brand_analysis;
}

/**
 * Every brand observed in one response: the monitored brand plus each competitor
 * the analysis named. A competitor's presence in the list *is* its mention.
 */
function observationsFor(
	record: AnalysisRecord,
	selfName: string,
): Map<string, Observation> {
	const result = new Map<string, Observation>();
	const analysis = record.brand_analysis;
	if (!analysis) return result;

	const ownSentiment = analysis.sentiment?.score;
	result.set(selfName, {
		mentioned: analysis.presence?.mentioned === true,
		rank: analysis.position?.rankPosition ?? null,
		sentiment: typeof ownSentiment === "number" ? ownSentiment : null,
	});

	for (const competitor of analysis.competitors ?? []) {
		const name = competitor.name?.trim();
		if (!name || name === selfName) continue;
		result.set(name, {
			mentioned: true,
			rank: competitor.rankPosition ?? null,
			sentiment:
				typeof competitor.sentiment === "number" ? competitor.sentiment : null,
		});
	}
	return result;
}

function addObservation(tally: Tally, observation: Observation): void {
	if (observation.mentioned) tally.mentions++;
	const { rank } = observation;
	if (rank !== null) {
		if (rank === 1) tally.first++;
		if (rank <= 3) tally.top3++;
		if (rank <= 6) tally.top6++;
	}
	// Sentiment only counts where the brand was actually mentioned: the analysis
	// writes a placeholder score for absent brands, which would otherwise land in
	// the negative bucket.
	const { sentiment } = observation;
	if (observation.mentioned && sentiment !== null) {
		if (sentiment >= POSITIVE_THRESHOLD) tally.positive++;
		else if (sentiment <= NEGATIVE_THRESHOLD) tally.negative++;
	}
}

function toRates(name: string, isSelf: boolean, tally: Tally, total: number) {
	const pct = (count: number) => (total > 0 ? (count / total) * 100 : 0);
	return {
		name,
		isSelf,
		mentionRate: pct(tally.mentions),
		firstRate: pct(tally.first),
		top3Rate: pct(tally.top3),
		top6Rate: pct(tally.top6),
		positiveRate: pct(tally.positive),
		negativeRate: pct(tally.negative),
	} satisfies BrandRates;
}

/** Leaderboard rows for every brand seen in the window, best mention rate first. */
export function summarizeBrands(
	records: AnalysisRecord[],
	selfName: string,
): { total: number; brands: BrandRates[] } {
	const analysed = records.filter(isAnalysed);
	const tallies = new Map<string, Tally>();

	for (const record of analysed) {
		for (const [name, observation] of observationsFor(record, selfName)) {
			const tally = tallies.get(name) ?? emptyTally();
			addObservation(tally, observation);
			tallies.set(name, tally);
		}
	}

	// The monitored brand always appears, even with nothing observed yet.
	if (!tallies.has(selfName)) tallies.set(selfName, emptyTally());

	const brands = [...tallies.entries()]
		.map(([name, tally]) =>
			toRates(name, name === selfName, tally, analysed.length),
		)
		.sort(
			(a, b) => b.mentionRate - a.mentionRate || a.name.localeCompare(b.name),
		);

	return { total: analysed.length, brands };
}

/** Per-day rate for the named brands. Days with no responses are left as gaps. */
export function buildBrandTrend(
	records: AnalysisRecord[],
	selfName: string,
	rate: RateKey,
	brandNames: string[],
): TrendData {
	const analysed = records.filter(isAnalysed);
	const byDay = new Map<
		string,
		{ total: number; tallies: Map<string, Tally> }
	>();

	for (const record of analysed) {
		const day = toDayKey(record.prompt_run_at);
		if (!day) continue;
		const bucket = byDay.get(day) ?? { total: 0, tallies: new Map() };
		bucket.total++;
		for (const [name, observation] of observationsFor(record, selfName)) {
			const tally = bucket.tallies.get(name) ?? emptyTally();
			addObservation(tally, observation);
			bucket.tallies.set(name, tally);
		}
		byDay.set(day, bucket);
	}

	const days = [...byDay.keys()].sort();
	return {
		categories: days.map(toAxisLabel),
		series: brandNames.map((name) => ({
			name,
			values: days.map((day) => {
				const bucket = byDay.get(day);
				if (!bucket || bucket.total === 0) return null;
				const tally = bucket.tallies.get(name);
				if (!tally) return 0;
				return round2(toRates(name, false, tally, bucket.total)[rate]);
			}),
		})),
	};
}

/**
 * Per-day rate for one brand, split by AI platform — the "platform comparison"
 * panels. Each platform is its own denominator so platforms with fewer runs are
 * not penalised.
 */
export function buildPlatformTrend(
	records: AnalysisRecord[],
	selfName: string,
	rate: RateKey,
	brandName: string,
): TrendData {
	const analysed = records.filter(isAnalysed);
	const byDay = new Map<string, Map<string, { total: number; tally: Tally }>>();
	const platforms = new Set<string>();

	for (const record of analysed) {
		const day = toDayKey(record.prompt_run_at);
		if (!day) continue;
		const provider = record.model_provider || "unknown";
		platforms.add(provider);
		const dayBucket = byDay.get(day) ?? new Map();
		const bucket = dayBucket.get(provider) ?? { total: 0, tally: emptyTally() };
		bucket.total++;
		const observation = observationsFor(record, selfName).get(brandName);
		if (observation) addObservation(bucket.tally, observation);
		dayBucket.set(provider, bucket);
		byDay.set(day, dayBucket);
	}

	const days = [...byDay.keys()].sort();
	return {
		categories: days.map(toAxisLabel),
		series: [...platforms].sort().map((provider) => ({
			name: provider,
			values: days.map((day) => {
				const bucket = byDay.get(day)?.get(provider);
				if (!bucket || bucket.total === 0) return null;
				return round2(
					toRates(brandName, false, bucket.tally, bucket.total)[rate],
				);
			}),
		})),
	};
}

/**
 * Terms the analyses attribute to the brand, weighted by how often they recur.
 * Core claims and differentiators are the only free-text signals stored, so they
 * stand in for the positive keyword cloud; there is no negative equivalent yet.
 */
export function collectPositiveKeywords(
	records: AnalysisRecord[],
	limit = 60,
): { text: string; value: number }[] {
	const counts = new Map<string, number>();
	for (const record of records) {
		if (!isAnalysed(record)) continue;
		const perception = record.brand_analysis?.perception;
		const terms = [
			...(perception?.coreClaims ?? []),
			...(perception?.differentiators ?? []),
		];
		for (const term of terms) {
			const text = term?.trim();
			if (!text) continue;
			counts.set(text, (counts.get(text) ?? 0) + 1);
		}
	}
	return [...counts.entries()]
		.map(([text, value]) => ({ text, value }))
		.sort((a, b) => b.value - a.value || a.text.localeCompare(b.text))
		.slice(0, limit);
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}
