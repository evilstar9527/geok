import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
const source = fs.readFileSync(
	new URL("../src/prompt/sourceCoverage.ts", import.meta.url),
	"utf8",
);
const code = ts.transpileModule(source, {
	compilerOptions: {
		module: ts.ModuleKind.ESNext,
		target: ts.ScriptTarget.ES2022,
	},
}).outputText;
const { summarizeSourceCoverage, summarizeReferenceEvidence } = await import(
	`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);
test("keeps missing capture distinct from recovered and legacy source data", () => {
	const rows = [
		{
			sources: [{ url: "https://example.com" }],
			collection_metadata: JSON.stringify({
				sourcesCoverage: "snapshot_partial",
			}),
		},
		{
			sources: [],
			collection_metadata: JSON.stringify({ sourcesCoverage: "not_exported" }),
		},
		{
			sources: [],
			collection_metadata: { sourcesCoverage: "snapshot_partial" },
		},
		{ sources: [], collection_metadata: "invalid" },
		{ sources: [{ url: "https://example.com" }] },
		{ sources: [], collection_metadata: null },
	];
	assert.deepEqual(summarizeSourceCoverage(rows), {
		withSources: 2,
		snapshotRecovered: 1,
		notCaptured: 2,
		unknown: 2,
	});
	assert.deepEqual(summarizeSourceCoverage([]), {
		withSources: 0,
		snapshotRecovered: 0,
		notCaptured: 0,
		unknown: 0,
	});
});

test("reference summaries keep unknown counts separate and preserve repeated observations", () => {
	const evidence = (count) => ({
		method: "snapshot-reference-badge-v1",
		badge: `搜索 2 个关键词，参考 ${count} 篇资料`,
		count,
	});
	const rows = [
		{
			model_provider: "doubao",
			sources: [],
			collection_metadata: { referenceEvidence: evidence(31) },
		},
		{
			model_provider: "doubao",
			sources: [{ url: "https://example.com" }],
			collection_metadata: JSON.stringify({ referenceEvidence: evidence(31) }),
		},
		{
			model_provider: "doubao",
			sources: [],
			collection_metadata: { referenceEvidence: evidence(0) },
		},
		{ model_provider: "doubao", sources: [], collection_metadata: "invalid" },
		{
			model_provider: "doubao",
			sources: [],
			collection_metadata: { referenceEvidence: { ...evidence(99), count: 7 } },
		},
		{ model_provider: "diandian", sources: [], collection_metadata: null },
		{ model_provider: "deepseek", sources: [], collection_metadata: {} },
	];
	const summary = summarizeReferenceEvidence(rows);
	assert.deepEqual(
		summary.find((r) => r.provider === "doubao"),
		{
			provider: "doubao",
			responses: 5,
			recordedResponses: 3,
			reportedTotal: 62,
			min: 0,
			max: 31,
			responsesWithoutLinks: 2,
			badges: [evidence(31).badge, evidence(0).badge],
		},
	);
	assert.deepEqual(
		summary.find((r) => r.provider === "diandian"),
		{
			provider: "diandian",
			responses: 1,
			recordedResponses: 0,
			reportedTotal: 0,
			min: null,
			max: null,
			responsesWithoutLinks: 0,
			badges: [],
		},
	);
	assert.equal(summary.length, 2);
	assert.deepEqual(summarizeReferenceEvidence([]), []);
	assert.equal(
		summarizeReferenceEvidence(rows.slice(0, 1))[0].reportedTotal,
		31,
	);
});
