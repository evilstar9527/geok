import assert from "node:assert/strict";
import test from "node:test";
import {
	aggregateExposureStatistics,
	buildExposureTerms,
	evaluateExposure,
	normalizeExposureText,
} from "../dist/index.js";

test("normalizes NFKC, case and whitespace", () => {
	assert.equal(normalizeExposureText("  Ｏｎｅ  GLANSE\n"), "one glanse");
});

test("matches Chinese substring and only counts one exposed response", () => {
	const result = evaluateExposure("豆包推荐极客工具，极客工具很好。", ["极客"]);
	assert.equal(result.exposed, true);
	assert.deepEqual(result.matches, ["极客"]);
});

test("uses word boundaries for English brand names", () => {
	assert.equal(evaluateExposure("I prefer Acme today", ["acme"]).exposed, true);
	assert.equal(
		evaluateExposure("Acmeology is different", ["acme"]).exposed,
		false,
	);
});

test("normalizes URLs and www hostnames", () => {
	const terms = buildExposureTerms({ domain: "https://www.Example.com/path" });
	assert.deepEqual(terms, ["example.com"]);
	assert.equal(
		evaluateExposure("See https://example.com/docs", terms).exposed,
		true,
	);
	assert.equal(evaluateExposure("See docs.example.com", terms).exposed, true);
	assert.equal(evaluateExposure("See example.com.evil", terms).exposed, false);
});

test("exposure denominator excludes failed and historical unassessed rows", () => {
	const stats = aggregateExposureStatistics([
		{
			runId: "1",
			exposureEvaluated: true,
			exposureMatches: ["brand"],
			status: "success",
		},
		{
			runId: "1",
			exposureEvaluated: true,
			exposureMatches: [],
			status: "success",
		},
		{
			runId: "1",
			exposureEvaluated: false,
			exposureMatches: [],
			status: "failed",
		},
		{ exposureEvaluated: false, exposureMatches: [], status: "success" },
	]);
	assert.deepEqual(stats, {
		planned: 3,
		successful: 2,
		failed: 1,
		exposed: 1,
		exposureRate: 0.5,
		completionRate: 2 / 3,
	});
});
