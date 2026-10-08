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
const { summarizeSourceCoverage } = await import(
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
