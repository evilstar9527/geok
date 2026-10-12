import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
	RUN,
	WORKSPACE,
	addTerms,
	assertPreserved,
	isTransientExtractionError,
	parseExtractionOutput,
	planBackfill,
	retryExtraction,
	validateBatchTerms,
	validateTerms,
	verifySnapshot,
} from "./backfill-menglai-sentiment.mjs";

const answer = "梦莱星柔软舒适，但价格偏高，售后不够及时。";
const digest = createHash("sha256").update(answer).digest("hex");
const brand = { id: WORKSPACE, name: "梦莱星", domain: "example.test" };
const response = {
	id: "r1",
	workspace_id: WORKSPACE,
	run_id: RUN,
	response: answer,
	collection_metadata: JSON.stringify({
		promptGroup: "brand",
		answerSha256: digest,
	}),
};
const original = {
	presence: { mentioned: true, visibility: 60 },
	position: { rankPosition: 1 },
	geoScore: { overall: 55 },
	sentiment: { score: 70 },
	competitors: [{ name: "Other", rankPosition: 2 }],
	metadata: {
		brandName: brand.name,
		brandDomain: brand.domain,
		analysisMethod: "codex-local-evidence-v1",
		answerSha256: digest,
	},
};
const row = (analysis = original) => ({
	id: "a1",
	response_id: "r1",
	workspace_id: WORKSPACE,
	brand_analysis: JSON.stringify(analysis),
});

test("plans only mentioned brand queries with missing terms and verified source hashes", () => {
	const plan = planBackfill([response], [row()], brand);
	assert.equal(plan.counts.pending, 1);
	assert.equal(plan.counts.mentioned, 1);
	const category = {
		...response,
		collection_metadata: { promptGroup: "category" },
	};
	assert.equal(planBackfill([category], [row()], brand).counts.brandQueries, 0);
	const absent = { ...original, presence: { mentioned: false } };
	assert.equal(
		planBackfill([response], [row(absent)], brand).counts.pending,
		0,
	);
	const complete = {
		...original,
		sentiment: { score: 70, positiveTerms: [], negativeTerms: [] },
	};
	assert.equal(
		planBackfill([response], [row(complete)], brand).counts.complete,
		1,
	);
});

test("rejects unrelated scope, changed answers, stale identity, and duplicate analysis", () => {
	assert.throws(() =>
		planBackfill([{ ...response, workspace_id: "other" }], [row()], brand),
	);
	assert.throws(() =>
		planBackfill([{ ...response, response: "changed" }], [row()], brand),
	);
	assert.throws(() =>
		planBackfill(
			[response],
			[
				row({
					...original,
					metadata: { ...original.metadata, brandName: "other" },
				}),
			],
			brand,
		),
	);
	assert.throws(() =>
		planBackfill([response], [row(), { ...row(), id: "a2" }], brand),
	);
	assert.throws(() => planBackfill([response, response], [row()], brand));
});

test("retains only verbatim phrases, deduplicates, and removes conflicting polarity", () => {
	assert.deepEqual(
		validateTerms(
			{
				positiveTerms: ["柔软舒适", "柔软舒适", "凭空赞美", "价格偏高"],
				negativeTerms: ["价格偏高", "售后不够及时"],
			},
			answer,
		),
		{
			positiveTerms: ["柔软舒适"],
			negativeTerms: ["售后不够及时"],
		},
	);
	assert.throws(() =>
		validateTerms({ positiveTerms: "wrong", negativeTerms: [] }, answer),
	);
	assert.throws(() =>
		validateTerms({ positiveTerms: [12], negativeTerms: [] }, answer),
	);
});

test("adding terms preserves all original scores, rankings, metadata and existing terms", () => {
	const terms = validateTerms(
		{ positiveTerms: ["柔软舒适"], negativeTerms: ["价格偏高"] },
		answer,
	);
	const updated = addTerms(original, terms, { method: "test" });
	assertPreserved(original, updated);
	assert.equal(updated.sentiment.score, 70);
	assert.equal(updated.position.rankPosition, 1);
	assert.deepEqual(original.sentiment, { score: 70 });
	const partial = {
		...original,
		sentiment: { score: 70, positiveTerms: ["既有词"] },
	};
	const completed = addTerms(partial, terms, { method: "test" });
	assert.deepEqual(completed.sentiment.positiveTerms, ["既有词"]);
	assertPreserved(partial, completed);
	assert.throws(() =>
		assertPreserved(original, {
			...updated,
			sentiment: { ...updated.sentiment, score: 80 },
		}),
	);
	assert.throws(() =>
		assertPreserved(original, { ...updated, presence: { mentioned: false } }),
	);
});

test("transient model failures retry with backoff and stop after three attempts", async () => {
	const waits = [];
	let calls = 0;
	const result = await retryExtraction(
		async () => {
			calls++;
			if (calls < 3)
				throw Object.assign(new Error("rate limited"), { status: 429 });
			return { positiveTerms: [], negativeTerms: [] };
		},
		async (milliseconds) => waits.push(milliseconds),
	);
	assert.deepEqual(result, { positiveTerms: [], negativeTerms: [] });
	assert.deepEqual(waits, [5000, 10000]);
	assert.equal(calls, 3);
	calls = 0;
	await assert.rejects(
		retryExtraction(
			async () => {
				calls++;
				throw Object.assign(new Error("bad model"), { status: 400 });
			},
			async () => {},
		),
	);
	assert.equal(calls, 1);
	class APIConnectionTimeoutError extends Error {}
	assert.equal(
		isTransientExtractionError(new APIConnectionTimeoutError()),
		true,
	);
	assert.equal(isTransientExtractionError(new SyntaxError()), false);
	calls = 0;
	await assert.rejects(
		retryExtraction(
			async () => {
				calls++;
				throw new APIConnectionTimeoutError();
			},
			async () => {},
		),
	);
	assert.equal(calls, 3);
});

test("a durable snapshot remains valid for unprocessed rows after a partial batch", () => {
	const first = row();
	const second = { ...row(), id: "a2", response_id: "r2" };
	const snapshot = [first, second]
		.map((value) => JSON.stringify(value))
		.join("\n");
	assert.doesNotThrow(() => verifySnapshot([{ row: second }], snapshot));
	assert.throws(() =>
		verifySnapshot(
			[{ row: { ...second, brand_analysis: "changed" } }],
			snapshot,
		),
	);
	assert.throws(() =>
		verifySnapshot([{ row: { ...second, id: "missing" } }], snapshot),
	);
	assert.throws(() =>
		verifySnapshot(
			[{ row: second }],
			[second, second].map((value) => JSON.stringify(value)).join("\n"),
		),
	);
});

test("truncated model JSON retries without fabricating empty term arrays", async () => {
	let calls = 0;
	const value = await retryExtraction(
		async () => {
			calls++;
			return parseExtractionOutput(
				calls === 1
					? '{"positiveTerms":['
					: '{"positiveTerms":[],"negativeTerms":["价格偏高"]}',
			);
		},
		async () => {},
	);
	assert.equal(calls, 2);
	assert.deepEqual(value, { positiveTerms: [], negativeTerms: ["价格偏高"] });
	assert.throws(() => parseExtractionOutput('{"positiveTerms":['), {
		name: "ExtractionOutputError",
	});
});

test("batched extraction associates ids and validates evidence separately for each answer", () => {
	const answers = ["梦莱星柔软舒适", "梦莱星价格偏高"];
	const terms = validateBatchTerms(
		{
			results: [
				{ id: "R2", positiveTerms: ["柔软舒适"], negativeTerms: ["价格偏高"] },
				{ id: "R1", positiveTerms: ["柔软舒适"], negativeTerms: ["价格偏高"] },
			],
		},
		answers,
	);
	assert.deepEqual(terms, [
		{ positiveTerms: ["柔软舒适"], negativeTerms: [] },
		{ positiveTerms: [], negativeTerms: ["价格偏高"] },
	]);
	assert.throws(() =>
		validateBatchTerms({ results: [{ id: "R1" }, { id: "R1" }] }, answers),
	);
	assert.throws(() =>
		validateBatchTerms({ results: [{ id: "R3" }, { id: "R2" }] }, answers),
	);
	assert.throws(() => validateBatchTerms({ results: [] }, answers));
});
