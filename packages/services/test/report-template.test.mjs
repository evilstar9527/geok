import assert from "node:assert/strict";
import test from "node:test";
import { buildTemplateSnapshot } from "../dist/report/buildTemplateSnapshot.js";

const brand = { name: "Example Brand", domain: "example.com" };
const row = (id, analysis, overrides = {}) => ({
	id,
	prompt: "Which brand?",
	model_provider: "doubao",
	run_utc: "2026-09-13 04:00:00",
	response: "Example Brand is one option.",
	sources: [{ url: "https://example.com/a" }],
	brand_analysis: analysis === null ? "" : JSON.stringify(analysis),
	...overrides,
});

test("pending and malformed analyses stay outside the mention-rate denominator", () => {
	const result = buildTemplateSnapshot(
		[
			row("1", { presence: { mentioned: true } }),
			row("2", { presence: { mentioned: false } }),
			row("3", null),
			row("4", null, { brand_analysis: "broken" }),
		],
		brand,
	);
	assert.deepEqual(
		[result.collected, result.analysed, result.mentioned, result.pending],
		[4, 2, 1, 2],
	);
	assert.equal(
		result.records.filter((record) => record.status === "pending").length,
		2,
	);
});

test("source occurrences, unique URLs and domains use distinct denominators", () => {
	const result = buildTemplateSnapshot(
		[
			row("1", null),
			row("2", null),
			row("3", null, {
				sources: [
					{ url: "https://www.example.com/b" },
					{ url: "https://news.example.com/c" },
				],
			}),
		],
		brand,
	);
	assert.deepEqual(
		[
			result.sourceCount,
			result.uniqueSourceUrls,
			result.sourceDomains,
			result.registeredDomainSources,
		],
		[4, 3, 2, 4],
	);
});

test("competitors count at most once per response and brand names are not hardcoded", () => {
	const result = buildTemplateSnapshot(
		[
			row("1", {
				presence: { mentioned: true },
				competitors: [
					{ name: "Other Brand" },
					{ name: "otherbrand" },
					{ name: "Example Brand" },
				],
			}),
		],
		brand,
	);
	assert.deepEqual(result.competitors, [{ name: "Other Brand", count: 1 }]);
	assert.match(result.evidence[0].text, /Example Brand/);
	assert.equal(result.evidence[0].time, "2026-09-13T04:00:00Z");
});

test("empty data produces no invented mentions, sources or time range", () => {
	const result = buildTemplateSnapshot([], brand);
	assert.deepEqual(
		[
			result.collected,
			result.analysed,
			result.mentioned,
			result.pending,
			result.sourceCount,
		],
		[0, 0, 0, 0, 0],
	);
	assert.equal(result.rangeStart, null);
	assert.deepEqual(result.evidence, []);
});

test("alias answers use only stored claims that also occur verbatim in the answer", () => {
	const answer = "Alias name\nA distinctive service claim.\nAnother brand";
	const result = buildTemplateSnapshot(
		[
			row(
				"1",
				{
					presence: { mentioned: true },
					perception: {
						coreClaims: [
							"Not actually in the answer",
							"A distinctive service claim.",
						],
					},
				},
				{ response: answer },
			),
		],
		brand,
	);
	assert.equal(result.evidence[0].text, "A distinctive service claim.");
});
