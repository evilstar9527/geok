import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
async function load(name) {
	const source = readFileSync(
		new URL(`../src/app/(auth)/dashboard/_utils/${name}.ts`, import.meta.url),
		"utf8",
	);
	const compiled = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.ESNext,
			target: ts.ScriptTarget.ES2022,
		},
	}).outputText;
	return import(
		`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
	);
}
const {
	getPromptScope,
	resolvePromptScope,
	filterPromptScope,
	summarizePromptScope,
} = await load("prompt-scope");
const { summarizeBrands } = await load("monitoring");
const row = (id, group, mentioned, analyzed = true) => ({
	id,
	prompt: "same repeated question",
	collection_metadata: { promptGroup: group },
	is_analysed: analyzed,
	brand_analysis: analyzed
		? {
				presence: { mentioned },
				competitors: [{ name: "Competitor", rankPosition: 1 }],
			}
		: null,
});

test("category and brand answers have separate denominators, including in leaderboards", () => {
	const records = [
		row("c1", "category", false),
		row("c2", "category", false),
		row("b1", "brand", true),
		row("c3", "category", false, false),
		row("old", undefined, true),
	];
	const category = filterPromptScope(records, "category");
	assert.deepEqual(
		category.map((r) => r.id),
		["c1", "c2", "c3"],
	);
	assert.deepEqual(summarizePromptScope(category), {
		collected: 3,
		analyzed: 2,
		mentions: 0,
		mentionRate: 0,
	});
	assert.equal(summarizeBrands(category, "Target").total, 2);
	assert.equal(
		summarizeBrands(category, "Target").brands.find((b) => b.isSelf)
			.mentionRate,
		0,
	);
	const brand = filterPromptScope(records, "brand");
	assert.deepEqual(summarizePromptScope(brand), {
		collected: 1,
		analyzed: 1,
		mentions: 1,
		mentionRate: 100,
	});
	assert.equal(summarizeBrands(brand, "Target").total, 1);
	assert.equal(
		summarizeBrands(brand, "Target").brands.find((b) => b.isSelf).mentionRate,
		100,
	);
	assert.deepEqual(
		filterPromptScope(records, "unclassified").map((r) => r.id),
		["old"],
	);
	assert.equal(filterPromptScope(records, "all").length, 5);
});

test("missing and unsupported metadata is unclassified; answer content never determines intent", () => {
	for (const metadata of [undefined, null, {}, { promptGroup: "unexpected" }])
		assert.equal(
			getPromptScope({
				prompt: "Target worth buying?",
				collection_metadata: metadata,
			}),
			"unclassified",
		);
	assert.equal(getPromptScope(row("natural", "category", true)), "category");
	assert.equal(getPromptScope(row("brand", "brand", false)), "brand");
});

test("default is category when available; explicit selections and legacy workspaces remain usable", () => {
	const records = [row("c", "category", false)];
	assert.equal(resolvePromptScope(null, records), "category");
	assert.equal(resolvePromptScope("invalid", records), "category");
	for (const group of ["category", "brand", "unclassified", "all"])
		assert.equal(resolvePromptScope(group, records), group);
	assert.equal(
		resolvePromptScope(null, [row("legacy", undefined, false)]),
		"all",
	);
	assert.equal(resolvePromptScope(null, []), "all");
	assert.equal(
		summarizePromptScope([row("pending", "category", false, false)])
			.mentionRate,
		null,
	);
	assert.equal(summarizePromptScope([]).mentionRate, null);
});
