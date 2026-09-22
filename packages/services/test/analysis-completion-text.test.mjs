import assert from "node:assert/strict";
import test from "node:test";
import {
	completionText,
	parseAnalysisJson,
} from "../dist/analysis/runAnalysis.js";

/**
 * The relay answers /chat/completions with these frames even when the request
 * does not ask for a stream, so the OpenAI client hands them back verbatim.
 */
const frame = (delta, finishReason = null) =>
	`data: ${JSON.stringify({
		id: "chatcmpl-1",
		object: "chat.completion.chunk",
		created: 1,
		model: "gpt-5.6-sol",
		choices: [{ index: 0, delta, finish_reason: finishReason }],
	})}\n\n`;

/** A complete stream: the given deltas, then the relay's stop frame and [DONE]. */
const stream = (...deltas) => {
	const frames = deltas.map((delta) => frame(delta));
	frames.push(frame({ content: "" }, "stop"));
	return `${frames.join("")}data: [DONE]\n\n`;
};

test("a JSON completion yields its message content", () => {
	const response = {
		choices: [
			{
				message: {
					role: "assistant",
					content: '  {"geoScore":{"overall":42}}  ',
				},
			},
		],
	};
	assert.equal(completionText(response), '{"geoScore":{"overall":42}}');
});

test("an SSE body is reassembled from its delta chunks", () => {
	const body = stream(
		{ role: "assistant" },
		{ content: '{"geoScore":' },
		{ content: '{"overall":42}}' },
	);
	assert.equal(completionText(body), '{"geoScore":{"overall":42}}');
});

test("an SSE body that carries no content yields an empty string", () => {
	assert.equal(completionText(stream({ role: "assistant" })), "");
});

test("an empty JSON completion yields an empty string", () => {
	assert.equal(completionText({ choices: [] }), "");
});

test("plain JSON parses unchanged", () => {
	const text = '{"geoScore":{"overall":35},"competitors":[{"name":"智推"}]}';
	assert.deepEqual(parseAnalysisJson(text), JSON.parse(text));
});

test("an ellipsis after the object does not discard the analysis", () => {
	// Observed tail from the live analysis model: the object ends, then "...".
	const text =
		'{"geoScore":{"overall":35},"presence":{"mentioned":true,"visibility":48},' +
		'"risks":{"items":[]}}...';
	assert.deepEqual(parseAnalysisJson(text), JSON.parse(text.slice(0, -3)));
});

test("a trailing commentary sentence does not discard the analysis", () => {
	const text =
		'{"geoScore":{"overall":0}}\n\nNote: brand absent from the response.';
	assert.deepEqual(parseAnalysisJson(text), { geoScore: { overall: 0 } });
});

test("braces inside strings do not end the object early", () => {
	const text = '{"bestKnownFor":"使用 {括号} 与 \\"引号\\" 的描述"}— 说明文字';
	assert.deepEqual(parseAnalysisJson(text), {
		bestKnownFor: '使用 {括号} 与 "引号" 的描述',
	});
});

test("a truncated object is still rejected", () => {
	assert.throws(
		() => parseAnalysisJson('{"geoScore":{"overall":35'),
		SyntaxError,
	);
});
