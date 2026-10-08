import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const fixture = {
	id: "response-1",
	prompt_id: "prompt-1",
	prompt: "推荐陪伴玩偶",
	workspace_id: "workspace-1",
	model_provider: "doubao",
	response: "完整回答正文".repeat(1000),
	is_analysed: true,
	brand_analysis: JSON.stringify({
		presence: { mentioned: true },
		position: { rankPosition: 2 },
	}),
	sources: [{ url: "https://example.test/article", title: "引用文章" }],
	collection_metadata: JSON.stringify({
		promptGroup: "category",
		sourcesCoverage: "snapshot_partial",
	}),
};
const stub = `export const calls = [];
export const clickhouse = { query: async (args) => {
 calls.push(args);
 const row = ${JSON.stringify(fixture)};
 if (args.query.includes("'' AS response")) row.response = '';
 return { json: async () => [row, {...row, id: 'response-2', is_analysed: false, brand_analysis: ''}] };
} };`;
const stubUrl = `data:text/javascript;base64,${Buffer.from(stub).toString("base64")}`;
const { calls } = await import(stubUrl);
const source = readFileSync(
	new URL("../src/analysis/fetchAnalysedPrompts.ts", import.meta.url),
	"utf8",
).replace('"@oneglanse/db"', JSON.stringify(stubUrl));
const compiled = ts.transpileModule(source, {
	compilerOptions: {
		module: ts.ModuleKind.ESNext,
		target: ts.ScriptTarget.ES2022,
	},
}).outputText;
const { fetchAnalysedPrompts } = await import(
	`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

test("summary preserves samples, pending status, sources and all metric inputs while skipping answer text", async () => {
	const full = await fetchAnalysedPrompts({ workspaceId: "workspace-1" });
	const summary = await fetchAnalysedPrompts({
		workspaceId: "workspace-1",
		includeResponse: false,
	});
	assert.deepEqual(
		summary,
		full.map((record) => ({ ...record, response: "" })),
	);
	assert.equal(full[0].response, fixture.response);
	assert.equal(summary[1].is_analysed, false);
	assert.equal(summary[0].collection_metadata.promptGroup, "category");
	assert.deepEqual(
		calls.map((call) => call.query_params),
		[
			{ workspaceId: "workspace-1", limit: 10000 },
			{ workspaceId: "workspace-1", limit: 10000 },
		],
	);
	assert.ok(
		!calls[1].query.includes("pr.response,"),
		"do not read the heavy column for overview",
	);
});
