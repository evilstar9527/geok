import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";
import ts from "typescript";

const source = readFileSync(
	new URL("../src/server/api/compress-json-response.ts", import.meta.url),
	"utf8",
);
const compiled = ts.transpileModule(source, {
	compilerOptions: {
		module: ts.ModuleKind.ESNext,
		target: ts.ScriptTarget.ES2022,
	},
}).outputText;
const { compressJsonResponse } = await import(
	`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const payload = JSON.stringify(
	Array.from({ length: 573 }, (_, id) => ({
		id,
		response: "梦莱星的完整回答及引用，中文不能损坏。".repeat(50),
		brand_analysis: {
			presence: { mentioned: id % 2 === 0 },
			position: { rankPosition: null },
		},
	})),
);
const request = (encoding) =>
	new Request("https://example.test/api/trpc/analysis.fetchAnalysis", {
		headers: encoding === undefined ? {} : { "Accept-Encoding": encoding },
	});

test("compresses JSON without changing records, status, cookies or Vary", async () => {
	const response = new Response(payload, {
		status: 207,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			Vary: "trpc-accept",
			"Set-Cookie": "session=preserved; HttpOnly",
			"Content-Length": String(Buffer.byteLength(payload)),
		},
	});
	response.headers.append("Set-Cookie", "other=preserved; HttpOnly");
	const result = await compressJsonResponse(
		request("gzip, deflate, br, zstd"),
		response,
	);
	const bytes = Buffer.from(await result.arrayBuffer());
	assert.equal(result.status, 207);
	assert.equal(result.headers.get("content-encoding"), "gzip");
	assert.equal(result.headers.get("content-length"), String(bytes.length));
	assert.match(result.headers.get("vary"), /trpc-accept, Accept-Encoding/);
	assert.equal(result.headers.getSetCookie().length, 2);
	assert.equal(gunzipSync(bytes).toString(), payload);
	assert.ok(bytes.length < Buffer.byteLength(payload) / 10);
});

test("respects absent encoding support and an explicit gzip opt-out over wildcard", async () => {
	for (const encoding of [
		undefined,
		"br",
		"gzip;q=0, *;q=1",
		"gzip;q=invalid",
	]) {
		const result = await compressJsonResponse(
			request(encoding),
			new Response(payload, {
				headers: { "Content-Type": "application/json" },
			}),
		);
		assert.equal(result.headers.get("content-encoding"), null);
		assert.match(result.headers.get("vary"), /Accept-Encoding/);
		assert.equal(await result.text(), payload);
	}
});

test("accepts a positive quality or wildcard and leaves small JSON intact", async () => {
	for (const encoding of ["GZip; q=0.5", "*;q=0.8"]) {
		const result = await compressJsonResponse(
			request(encoding),
			new Response(payload, {
				headers: { "Content-Type": "application/json" },
			}),
		);
		assert.equal(
			gunzipSync(Buffer.from(await result.arrayBuffer())).toString(),
			payload,
		);
	}
	const result = await compressJsonResponse(
		request("gzip"),
		Response.json({ ok: true }),
	);
	assert.equal(result.headers.get("content-encoding"), null);
	assert.deepEqual(await result.json(), { ok: true });
});

test("does not consume streaming, already encoded, or bodyless responses", async () => {
	for (const response of [
		new Response("data: pending\n\n", {
			headers: { "Content-Type": "text/event-stream" },
		}),
		new Response("encoded", {
			headers: { "Content-Type": "application/json", "Content-Encoding": "br" },
		}),
		new Response(null, { status: 204 }),
	]) {
		assert.equal(
			await compressJsonResponse(request("gzip"), response),
			response,
		);
		assert.equal(response.bodyUsed, false);
	}
});
