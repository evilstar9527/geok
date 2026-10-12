import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { pathToFileURL } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const dataModule = (source) =>
	`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const compile = (source) =>
	ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.ESNext,
			target: ts.ScriptTarget.ES2022,
			jsx: ts.JsxEmit.ReactJSX,
		},
	}).outputText;
const utilsSource = readFileSync(
	new URL("../src/app/(auth)/dashboard/_utils/monitoring.ts", import.meta.url),
	"utf8",
);
const utilsUrl = dataModule(compile(utilsSource));
const {
	collectSentimentKeywords,
	summarizeBrands,
	summarizeBrandSentiment,
	buildBrandTrend,
} = await import(utilsUrl);

const row = (id, group = "brand", mentioned = true) => ({
	id,
	prompt_run_at: "2026-10-12T02:00:00Z",
	model_provider: "doubao",
	collection_metadata: { promptGroup: group },
	is_analysed: true,
	brand_analysis: {
		presence: { mentioned },
		position: { rankPosition: 1 },
		sentiment: {
			score: 70,
			positiveTerms: ["柔软", "柔软", " 柔软 "],
			negativeTerms: ["价格偏高"],
		},
		perception: { coreClaims: ["中性事实", "负面观点"] },
		competitors: [{ name: "Other", rankPosition: 2, sentiment: 50 }],
	},
});

test("word clouds use independent sentiment arrays, count once per answer, and exclude absent and pending brands", () => {
	const records = [
		row("a"),
		row("b"),
		row("absent", "brand", false),
		{ ...row("pending"), is_analysed: false },
	];
	assert.deepEqual(collectSentimentKeywords(records, "positive"), [
		{ text: "柔软", value: 2 },
	]);
	assert.deepEqual(collectSentimentKeywords(records, "negative"), [
		{ text: "价格偏高", value: 2 },
	]);
	const legacy = row("legacy");
	legacy.brand_analysis.sentiment = { score: 70 };
	assert.deepEqual(collectSentimentKeywords([legacy], "positive"), []);
	assert.deepEqual(collectSentimentKeywords([legacy], "negative"), []);
});

test("historical ranks in brand queries do not become first or top-three observations", () => {
	const { brands } = summarizeBrands([row("brand")], "Target");
	for (const brand of brands) {
		assert.equal(brand.firstRate, 0);
		assert.equal(brand.top3Rate, 0);
	}
	assert.equal(brands.find((brand) => brand.isSelf).positiveRate, 100);
	const category = summarizeBrands([row("category", "category")], "Target");
	assert.equal(category.brands.find((brand) => brand.isSelf).firstRate, 100);
});

// Stub only chart surfaces and locale; render the actual view and aggregation.
const uiUrl = dataModule(
	'export const NEGATIVE_COLOR="red", POSITIVE_COLOR="green"; export const TreemapPanel=()=>null, TrendPanel=()=>null, WordCloud=()=>null;',
);
const localeUrl = dataModule(
	'export const useLocale=()=>({t:(text)=>text,locale:"en"});',
);
const sourceUtilsUrl = dataModule(
	'export const PROVIDER_DISPLAY={}, classifySourceMedia=()=>"other", getSourceMediaDefinition=()=>({label:"Other"});',
);
let compiled = compile(
	readFileSync(
		new URL(
			"../src/app/(auth)/dashboard/_components/overview-panels.tsx",
			import.meta.url,
		),
		"utf8",
	),
);
compiled = compiled
	.replace('"@/lib/i18n/locale-context"', JSON.stringify(localeUrl))
	.replace('"@oneglanse/ui"', JSON.stringify(uiUrl))
	.replace('"@oneglanse/utils"', JSON.stringify(sourceUtilsUrl))
	.replace('"../_utils/monitoring"', JSON.stringify(utilsUrl))
	.replace(
		/import styles from "\.\/overview.module.css";/,
		"const styles = {};",
	)
	.replace(
		'"react/jsx-runtime"',
		JSON.stringify(pathToFileURL(require.resolve("react/jsx-runtime")).href),
	)
	.replace(
		'"react"',
		JSON.stringify(pathToFileURL(require.resolve("react")).href),
	);
const { MonitoringOverview } = await import(dataModule(compiled));
const render = (scope, records) =>
	renderToStaticMarkup(
		React.createElement(MonitoringOverview, {
			promptScope: scope,
			records,
			brandName: "Target",
			sources: [],
		}),
	);

test("brand scope renders only sentiment panels, including when empty", () => {
	for (const records of [[], [row("brand")]]) {
		const html = render("brand", records);
		assert.match(html, /Brand sentiment index/);
		assert.match(html, /Brand sentiment terms/);
		assert.doesNotMatch(
			html,
			/Brand rank|Brand leaderboard|First mention rate|Top3 mention rate|Source analysis|competitive position|Mention rate trend/,
		);
	}
});

test("mixed scope competition uses category responses only", () => {
	const html = render("all", [
		row("category", "category", false),
		row("brand"),
	]);
	assert.match(html, /1 analysed category responses/);
	assert.match(html, /Brand leaderboard/);
	assert.match(html, /#2/);
});

test("historical missing extraction is displayed explicitly", () => {
	const legacy = row("old");
	legacy.brand_analysis.sentiment = { score: 70 };
	assert.match(render("brand", [legacy]), /answers lack term extraction/);
});

test("573 category answers with no brand mentions have no measured sentiment", () => {
	const records = Array.from({ length: 573 }, (_, index) =>
		row(String(index), "category", false),
	);
	assert.deepEqual(summarizeBrandSentiment(records), {
		analyzed: 573,
		mentioned: 0,
		scored: 0,
		unknown: 0,
		positive: 0,
		negative: 0,
		neutral: 0,
	});
	const trend = buildBrandTrend(records, "Target", "positiveRate", ["Target"]);
	assert.deepEqual(trend.series[0].values, [null]);
	const html = renderToStaticMarkup(
		React.createElement(MonitoringOverview, {
			promptScope: "category",
			records,
			brandName: "Target",
			sources: [],
			onViewBrandQueries: () => {},
		}),
	);
	assert.match(html, /None of the 573 answers mentions Target/);
	assert.match(html, /View brand-query sentiment/);
	const panel = html.slice(
		html.indexOf("Brand sentiment index"),
		html.indexOf("Brand sentiment terms"),
	);
	assert.doesNotMatch(panel, /0\.00%/);
});

test("measured neutral answers are distinguished from missing and invalid sentiment", () => {
	const neutral = row("neutral");
	neutral.brand_analysis.sentiment.score = 50;
	const records = [
		neutral,
		row("absent", "brand", false),
		...[undefined, Number.NaN, 101, -1].map((score, index) => {
			const record = row(String(index));
			record.brand_analysis.sentiment = { score };
			return record;
		}),
	];
	assert.deepEqual(summarizeBrandSentiment(records), {
		analyzed: 6,
		mentioned: 5,
		scored: 1,
		unknown: 4,
		positive: 0,
		negative: 0,
		neutral: 1,
	});
	assert.deepEqual(
		buildBrandTrend([neutral], "Target", "positiveRate", ["Target"]).series[0]
			.values,
		[0],
	);
	assert.match(render("brand", [neutral]), /0\.00%/);
	const missing = row("missing");
	missing.brand_analysis.sentiment = {};
	assert.match(render("brand", [missing]), /no valid sentiment scores/);
	assert.deepEqual(
		buildBrandTrend([missing], "Target", "negativeRate", ["Target"]).series[0]
			.values,
		[null],
	);
});
