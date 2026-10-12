import assert from "node:assert/strict";
import test from "node:test";
import { analysisPrompt } from "../dist/analysis/analysisPrompt.js";
import {
	applyQueryIntent,
	capturedPromptGroup,
} from "../dist/analysis/queryIntent.js";
import { normalizeAnalysisResult } from "../dist/analysis/runAnalysis.js";

const input = {
	brandName: "梦莱星",
	brandDomain: "example.test",
	prompt: "梦莱星和其他品牌哪个好？",
	promptGroup: "brand",
	response: "梦莱星柔软舒适，但价格偏高，售后不够及时。竞品很便宜。",
};
const analysis = () => ({
	geoScore: { overall: 55 },
	recommendation: { type: "mentioned_only" },
	perception: {
		coreClaims: [],
		differentiators: [],
		bestKnownFor: null,
		pricingPerception: "not_mentioned",
	},
	risks: { items: [] },
	presence: { mentioned: true, visibility: 60 },
	position: { rankPosition: 1 },
	sentiment: {
		score: 65,
		positiveTerms: ["柔软舒适", "柔软舒适", "凭空赞美"],
		negativeTerms: ["价格偏高", "售后不够及时"],
	},
	competitors: [{ name: "竞品", rankPosition: 2 }],
});

test("captured intent accepts serialized and parsed metadata and does not guess legacy intent", () => {
	assert.equal(capturedPromptGroup('{"promptGroup":"brand"}'), "brand");
	assert.equal(capturedPromptGroup({ promptGroup: "category" }), "category");
	for (const value of [
		undefined,
		null,
		"bad JSON",
		{},
		{ promptGroup: "other" },
	])
		assert.equal(capturedPromptGroup(value), undefined);
});

test("brand queries, including comparisons, have no target or competitor rank", () => {
	const result = normalizeAnalysisResult(analysis(), input);
	assert.equal(result.position.rankPosition, null);
	assert.equal(result.competitors[0].rankPosition, null);
	assert.equal(result.sentiment.score, 65);
	assert.deepEqual(result.sentiment.positiveTerms, ["柔软舒适"]);
	assert.deepEqual(result.sentiment.negativeTerms, [
		"价格偏高",
		"售后不够及时",
	]);
});

test("category queries retain rankings and both sentiment polarities", () => {
	const result = normalizeAnalysisResult(analysis(), {
		...input,
		promptGroup: "category",
	});
	assert.equal(result.position.rankPosition, 1);
	assert.equal(result.competitors[0].rankPosition, 2);
	assert.equal(result.sentiment.negativeTerms.length, 2);
});

test("reading historical brand ranks masks them without mutating stored analysis", () => {
	const stored = analysis();
	const result = applyQueryIntent(stored, "brand");
	assert.equal(result.position.rankPosition, null);
	assert.equal(result.competitors[0].rankPosition, null);
	assert.equal(stored.position.rankPosition, 1);
	assert.equal(stored.competitors[0].rankPosition, 2);
	assert.equal(applyQueryIntent(stored, undefined), stored);
});

test("absent brands cannot acquire sentiment terms from unrelated answer text", () => {
	const parsed = analysis();
	parsed.presence.mentioned = false;
	const result = normalizeAnalysisResult(parsed, input);
	assert.deepEqual(result.sentiment.positiveTerms, []);
	assert.deepEqual(result.sentiment.negativeTerms, []);
});

test("malformed or missing term arrays do not break analysis", () => {
	const parsed = analysis();
	parsed.sentiment.positiveTerms = "incorrect shape";
	parsed.sentiment.negativeTerms = undefined;
	const result = normalizeAnalysisResult(parsed, input);
	assert.equal(result.sentiment.positiveTerms, undefined);
	assert.equal(result.sentiment.negativeTerms, undefined);
});

test("analysis instructions apply the captured brand rule and rank-free score formula", () => {
	const prompt = analysisPrompt(input);
	assert.match(prompt, /Captured query group: brand/);
	assert.match(
		prompt,
		/even if the answer contains a numbered list or comparisons/,
	);
	assert.match(
		prompt,
		/presence.visibility \+ sentiment.score \+ recommendation_value/,
	);
	assert.match(prompt, /Preserve negation/);
});
