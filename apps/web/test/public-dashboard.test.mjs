import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
	new URL("../src/app/api/public/dashboard/route.ts", import.meta.url),
	"utf8",
);
const mocked =
	`export const mock = { calls: [], result: null, error: null };\n` +
	source.replace(
		'const { fetchPublicDashboard } = await import("@oneglanse/services");',
		`const fetchPublicDashboard = async workspaceId => {
		mock.calls.push(workspaceId);
		if (mock.error) throw mock.error;
		return mock.result;
	};`,
	);
const compiled = ts.transpileModule(mocked, {
	compilerOptions: {
		module: ts.ModuleKind.ESNext,
		target: ts.ScriptTarget.ES2022,
	},
}).outputText;
const { GET, mock } = await import(
	`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const origin = "http://8.133.177.51";
const request = (query = "", caller = origin) =>
	GET(
		new Request(`https://example.com/api/public/dashboard${query}`, {
			headers: { Origin: caller },
		}),
	);
const payload = {
	id: "live",
	source: "database",
	createdAt: "2026-09-19T12:00:00Z",
	data: { brand: { name: "Current Brand" } },
};

test("middleware exposes only the exact live dashboard endpoint", () => {
	const middleware = readFileSync(
		new URL("../middleware.ts", import.meta.url),
		"utf8",
	);
	const pattern = middleware.match(/"(\/\(\(\?![^"\n]+)"/)?.[1];
	assert.ok(pattern);
	const protectedPath = new RegExp(`^${pattern}$`);
	assert.equal(protectedPath.test("/api/public/dashboard"), false);
	assert.equal(protectedPath.test("/api/public/dashboard/"), false);
	assert.equal(protectedPath.test("/api/public/dashboard-admin"), true);
	assert.equal(protectedPath.test("/api/public/another-endpoint"), true);
});

test("public live dashboard fails closed unless a server workspace is configured", async (t) => {
	const previous = process.env.PUBLIC_DASHBOARD_WORKSPACE_ID;
	t.after(() =>
		previous === undefined
			? delete process.env.PUBLIC_DASHBOARD_WORKSPACE_ID
			: (process.env.PUBLIC_DASHBOARD_WORKSPACE_ID = previous),
	);
	delete process.env.PUBLIC_DASHBOARD_WORKSPACE_ID;
	mock.calls.length = 0;
	const response = await request();
	assert.equal(response.status, 503);
	assert.equal(response.headers.get("Cache-Control"), "no-store");
	assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
	assert.deepEqual(mock.calls, []);
});

test("reads only the configured workspace and rejects client overrides", async (t) => {
	const previous = process.env.PUBLIC_DASHBOARD_WORKSPACE_ID;
	t.after(() =>
		previous === undefined
			? delete process.env.PUBLIC_DASHBOARD_WORKSPACE_ID
			: (process.env.PUBLIC_DASHBOARD_WORKSPACE_ID = previous),
	);
	process.env.PUBLIC_DASHBOARD_WORKSPACE_ID = "private-authorized-workspace";
	mock.calls.length = 0;
	mock.result = payload;
	mock.error = null;
	const response = await request();
	assert.equal(response.status, 200);
	assert.deepEqual(await response.json(), payload);
	assert.deepEqual(mock.calls, ["private-authorized-workspace"]);
	assert.equal(response.headers.get("Access-Control-Allow-Credentials"), null);
	assert.equal(response.headers.get("Vary"), "Origin");
	assert.equal((await request("?workspaceId=another-workspace")).status, 400);
	assert.equal(mock.calls.length, 1);
	assert.equal(
		(await request("", "https://unrelated.example")).headers.get(
			"Access-Control-Allow-Origin",
		),
		null,
	);
});

test("missing workspaces and database failures return generic uncached errors", async (t) => {
	const previous = process.env.PUBLIC_DASHBOARD_WORKSPACE_ID;
	t.after(() =>
		previous === undefined
			? delete process.env.PUBLIC_DASHBOARD_WORKSPACE_ID
			: (process.env.PUBLIC_DASHBOARD_WORKSPACE_ID = previous),
	);
	process.env.PUBLIC_DASHBOARD_WORKSPACE_ID = "private-authorized-workspace";
	mock.result = null;
	mock.error = null;
	assert.equal((await request()).status, 404);
	mock.error = new Error(
		"database://user:password@internal private-authorized-workspace",
	);
	const response = await request();
	assert.equal(response.status, 503);
	assert.equal(response.headers.get("Cache-Control"), "no-store");
	assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
	assert.deepEqual(await response.json(), { error: "暂时无法读取看板数据" });
	mock.error = null;
});
