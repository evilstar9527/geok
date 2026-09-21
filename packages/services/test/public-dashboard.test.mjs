import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicDashboard } from "../dist/dashboard/buildPublicDashboard.js";

const brand = { name: "Current Brand", domain: "current.example" };
const now = "2026-09-19T12:00:00Z";
const response = (id, overrides = {}) => ({
	id,
	prompt_id: "prompt-1",
	prompt: "Which brand?",
	model_provider: "kimi",
	run_utc: "2026-09-19 04:00:00",
	response: "Current Brand is an option.",
	sources: [{ url: "https://current.example/a" }],
	...overrides,
});
const analysis = (id, responseId, mentioned, overrides = {}) => ({
	id,
	response_id: responseId,
	prompt_id: "prompt-1",
	model_provider: "kimi",
	run_utc: "2026-09-19 04:00:00",
	created_utc: "2026-09-19 05:00:00",
	brand_analysis: JSON.stringify({
		presence: { mentioned },
		metadata: { brandName: brand.name, brandDomain: brand.domain },
	}),
	...overrides,
});
const build = (responses, analyses) =>
	buildPublicDashboard(responses, analyses, brand, now);

test("latest response-id analysis keeps repeated samples separate and wins over legacy", () => {
	const result = build(
		[response("a"), response("b")],
		[
			analysis("new", "a", true, { created_utc: "2026-09-19 06:00:00" }),
			analysis("old", "a", false),
			analysis("b", "b", false),
			analysis("legacy", "", true, { created_utc: "2026-09-19 07:00:00" }),
		],
	);
	assert.deepEqual(
		result.data.templateSnapshot.records.map((r) => r.status),
		["mentioned", "not_mentioned"],
	);
	assert.equal(result.data.totalResponses, 2);
	assert.equal(result.data.mentionRates[0].mentionRate, 50);
});

test("legacy analyses only match an unambiguous prompt/provider/run tuple", () => {
	const legacy = analysis("legacy", "", true);
	assert.equal(
		build([response("a")], [legacy]).data.templateSnapshot.analysed,
		1,
	);
	const repeated = build([response("a"), response("b")], [legacy]);
	assert.equal(repeated.data.templateSnapshot.pending, 2);
	assert.equal(
		build([response("a", { model_provider: "yuanbao" })], [legacy]).data
			.totalResponses,
		0,
	);
	assert.equal(
		build([response("a")], [analysis("other", "unrelated-response", true)]).data
			.totalResponses,
		0,
	);
});

test("a renamed brand or invalid latest exact analysis cannot revive an older result", () => {
	for (const value of [
		"broken",
		JSON.stringify({
			presence: { mentioned: true },
			metadata: { brandName: "Old Brand" },
		}),
		JSON.stringify({
			presence: { mentioned: true },
			metadata: { brandName: brand.name, brandDomain: "old.example" },
		}),
	]) {
		const result = build(
			[response("a")],
			[
				analysis("legacy", "", true),
				analysis("exact", "a", true, { brand_analysis: value }),
			],
		);
		assert.equal(result.data.templateSnapshot.pending, 1);
		assert.equal(result.data.templateSnapshot.mentioned, 0);
		assert.equal(result.data.templateSnapshot.records[0].sentimentScore, null);
	}
});

test("live record extensions expose only valid current analysis fields and original source URLs", () => {
	const raw = {
		presence: { mentioned: true },
		sentiment: { score: 72 },
		position: { rankPosition: 2 },
		competitors: [{ name: " Rival " }, { name: "rival" }, { name: brand.name }],
		privateNote: "not-public",
	};
	const result = build(
		[
			response("a", {
				response: "x".repeat(500),
				sources: [
					{ url: "https://current.example/a" },
					{ url: "javascript:alert(1)" },
					{ url: "broken" },
				],
			}),
		],
		[analysis("exact", "a", true, { brand_analysis: JSON.stringify(raw) })],
	);
	const record = result.data.templateSnapshot.records[0];
	assert.equal(record.sentimentScore, 72);
	assert.equal(record.rankPosition, 2);
	assert.equal(record.excerpt.length, 360);
	assert.deepEqual(record.sourceUrls, ["https://current.example/a"]);
	assert.deepEqual(record.competitorNames, ["rival"]);
	assert.equal(JSON.stringify(result).includes("not-public"), false);
});

test("missing analysis does not invent sentiment, rank or competitor values", () => {
	const result = build([response("a")], []);
	const record = result.data.templateSnapshot.records[0];
	assert.equal(record.sentimentScore, null);
	assert.equal(record.rankPosition, null);
	assert.equal(record.excerpt, null);
	assert.deepEqual(record.competitorNames, []);
	assert.deepEqual(record.sourceUrls, ["https://current.example/a"]);
});

test("empty live data uses current brand and capture time without report or workspace identifiers", () => {
	const result = build([], []);
	assert.deepEqual(Object.keys(result), ["id", "source", "createdAt", "data"]);
	assert.equal(result.id, "live");
	assert.equal(result.source, "database");
	assert.equal(result.createdAt, now);
	assert.deepEqual(result.data.brand, brand);
	assert.equal(result.data.templateSnapshot.collected, 0);
	assert.equal(result.data.totalResponses, 0);
});
