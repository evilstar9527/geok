import type { AnalysisRecord } from "@oneglanse/types";

/** Aggregate only analyzed responses; missing sentiment is not neutral sentiment. */
export function summarizeResponses(records: AnalysisRecord[]) {
	const daily = new Map<string, { total: number; mentions: number }>();
	const sentiments = { positive: 0, neutral: 0, negative: 0, unknown: 0 };
	for (const record of records) {
		if (!record.is_analysed || !record.brand_analysis) continue;
		const mentioned = record.brand_analysis.presence?.mentioned === true;
		const date = new Date(record.prompt_run_at);
		if (!Number.isNaN(date.getTime())) {
			const day = date.toLocaleDateString("en-CA", {
				timeZone: "Asia/Shanghai",
			});
			const entry = daily.get(day) ?? { total: 0, mentions: 0 };
			entry.total++;
			if (mentioned) entry.mentions++;
			daily.set(day, entry);
		}
		if (!mentioned) continue;
		const score = record.brand_analysis.sentiment?.score;
		if (typeof score !== "number" || !Number.isFinite(score))
			sentiments.unknown++;
		else if (score >= 60) sentiments.positive++;
		else if (score <= 40) sentiments.negative++;
		else sentiments.neutral++;
	}
	return {
		daily: [...daily.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([date, entry]) => ({
				date,
				...entry,
				rate: (entry.mentions / entry.total) * 100,
			})),
		sentiments,
	};
}
