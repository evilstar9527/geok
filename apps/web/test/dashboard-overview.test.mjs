import assert from "node:assert/strict";
import test from "node:test";
import { summarizeResponses } from "../src/app/(auth)/dashboard/_utils/overview.ts";

const row = (date, mentioned, score, analyzed = true) => ({
	prompt_run_at: date,
	is_analysed: analyzed,
	brand_analysis: {
		presence: { mentioned },
		...(score === undefined ? {} : { sentiment: { score } }),
	},
});

test("uses Beijing collection dates and analyzed responses as the denominator", () => {
	const result = summarizeResponses([
		row("2026-09-06T16:05:00Z", true, 80),
		row("2026-09-07T01:00:00Z", false, 0),
		row("2026-09-07T02:00:00Z", true, 80, false),
		row("2026-09-05T01:00:00Z", false, 0),
	]);
	assert.deepEqual(result.daily, [
		{ date: "2026-09-05", total: 1, mentions: 0, rate: 0 },
		{ date: "2026-09-07", total: 2, mentions: 1, rate: 50 },
	]);
});

test("excludes absent brands and keeps missing sentiment separate", () => {
	const scores = [0, 40, 41, 59, 60, 100, undefined, Number.NaN];
	const result = summarizeResponses([
		...scores.map((score) => row("2026-09-07T01:00:00Z", true, score)),
		row("2026-09-07T01:00:00Z", false, 0),
	]);
	assert.deepEqual(result.sentiments, {
		positive: 2,
		neutral: 2,
		negative: 2,
		unknown: 2,
	});
});

test("does not invent daily samples for missing or invalid timestamps", () => {
	assert.deepEqual(summarizeResponses([]).daily, []);
	const result = summarizeResponses([row("invalid", true, 80)]);
	assert.deepEqual(result.daily, []);
	assert.equal(result.sentiments.positive, 1);
});
