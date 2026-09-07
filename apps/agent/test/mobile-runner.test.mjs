import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { runMobileProviderBatch } from "../dist/mobile/runner.js";

async function readBody(request) {
	const chunks = [];
	for await (const chunk of request) chunks.push(chunk);
	return chunks.length
		? JSON.parse(Buffer.concat(chunks).toString("utf8"))
		: {};
}

test("mobile batch extracts copied response, evaluates exposure and stores final screenshot metadata", async () => {
	const screenshots = [];
	let clipboardValue = "极客品牌推荐答案";
	let sourceValue = "<hierarchy><android.widget.EditText /></hierarchy>";
	let elementText = "Accessibility 回退答案";
	const server = createServer((request, response) => {
		void (async () => {
			await readBody(request);
			response.setHeader("content-type", "application/json");
			const path = request.url ?? "";
			if (path === "/session" && request.method === "POST")
				return response.end(
					JSON.stringify({ value: { sessionId: "mobile-1" } }),
				);
			if (path.endsWith("/source"))
				return response.end(JSON.stringify({ value: sourceValue }));
			if (path.endsWith("/elements"))
				return response.end(
					JSON.stringify({
						value: [{ "element-6066-11e4-a52e-4f735466cecf": "element-1" }],
					}),
				);
			if (path.endsWith("/appium/device/get_clipboard"))
				return response.end(
					JSON.stringify({
						value: Buffer.from(clipboardValue).toString("base64"),
					}),
				);
			if (path.endsWith("/text"))
				return response.end(JSON.stringify({ value: elementText }));
			if (path.endsWith("/screenshot"))
				return response.end(JSON.stringify({ value: "cG5n" }));
			return response.end(JSON.stringify({ value: null }));
		})().catch((error) => {
			response.statusCode = 500;
			response.end(JSON.stringify({ value: { message: error.message } }));
		});
	});
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	assert.ok(address && typeof address === "object");
	const mockDevice = {
		id: "00000000-0000-0000-0000-000000000001",
		workspaceId: "workspace-1",
		name: "mock phone",
		kind: "remote_appium",
		serial: "mock-1",
		appiumUrl: "configured",
		supportedProviders: ["doubao"],
		enabled: true,
		status: "ready",
		model: "Mock",
		androidVersion: "15",
		appiumVersion: "2.0.0",
		lastCheckedAt: null,
		lastError: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};
	try {
		const results = await runMobileProviderBatch({
			device: mockDevice,
			secret: { appiumUrl: `http://127.0.0.1:${address.port}` },
			provider: "doubao",
			payload: {
				user_id: "user-1",
				workspace_id: "workspace-1",
				created_at: new Date().toISOString(),
				prompts: [{ id: "prompt-1", prompt: "推荐一个品牌" }],
			},
			runId: "run-1",
			exposureTerms: ["极客"],
			pollIntervalMs: 1,
			saveScreenshot: async (metadata) => {
				screenshots.push(metadata);
				return "artifact-1";
			},
		});
		assert.equal(results.length, 1);
		assert.equal(results[0].response, "极客品牌推荐答案");
		assert.deepEqual(results[0].collection.exposureMatches, ["极客"]);
		assert.equal(results[0].collection.screenshotArtifactId, "artifact-1");
		assert.equal(screenshots[0].kind, "success");

		clipboardValue = "";
		const fallback = await runMobileProviderBatch({
			device: mockDevice,
			secret: { appiumUrl: `http://127.0.0.1:${address.port}` },
			provider: "doubao",
			payload: {
				user_id: "user-1",
				workspace_id: "workspace-1",
				created_at: new Date().toISOString(),
				prompts: [{ id: "prompt-2", prompt: "回退" }],
			},
			runId: "run-2",
			exposureTerms: ["回退"],
			pollIntervalMs: 1,
			saveScreenshot: async () => "artifact-2",
		});
		assert.equal(fallback[0].response, "Accessibility 回退答案");

		elementText = "";
		const timedOut = await runMobileProviderBatch({
			device: mockDevice,
			secret: { appiumUrl: `http://127.0.0.1:${address.port}` },
			provider: "doubao",
			payload: {
				user_id: "user-1",
				workspace_id: "workspace-1",
				created_at: new Date().toISOString(),
				prompts: [{ id: "prompt-3", prompt: "超时" }],
			},
			runId: "run-3",
			exposureTerms: ["极客"],
			pollIntervalMs: 1,
			responseTimeoutMs: 5,
			saveScreenshot: async () => "artifact-timeout",
		});
		assert.equal(timedOut[0].collection.status, "failed");
		assert.match(timedOut[0].collection.failureReason, /Timed out/);

		sourceValue = "<hierarchy text='手机号登录' />";
		let loginMarked = false;
		await assert.rejects(
			runMobileProviderBatch({
				device: mockDevice,
				secret: { appiumUrl: `http://127.0.0.1:${address.port}` },
				provider: "doubao",
				payload: {
					user_id: "user-1",
					workspace_id: "workspace-1",
					created_at: new Date().toISOString(),
					prompts: [{ id: "prompt-4", prompt: "登录检测" }],
				},
				runId: "run-4",
				exposureTerms: ["极客"],
				saveScreenshot: async () => "artifact-login",
				markLoginRequired: async () => {
					loginMarked = true;
				},
			}),
			/login_required/,
		);
		assert.equal(loginMarked, true);

		sourceValue = "<hierarchy />";
		const controller = new AbortController();
		controller.abort();
		await assert.rejects(
			runMobileProviderBatch({
				device: mockDevice,
				secret: { appiumUrl: `http://127.0.0.1:${address.port}` },
				provider: "doubao",
				payload: {
					user_id: "user-1",
					workspace_id: "workspace-1",
					created_at: new Date().toISOString(),
					prompts: [{ id: "prompt-5", prompt: "取消" }],
				},
				runId: "run-5",
				exposureTerms: ["极客"],
				signal: controller.signal,
				pollIntervalMs: 1,
				responseTimeoutMs: 5,
				saveScreenshot: async () => "artifact-cancel",
			}),
			/cancelled/,
		);
	} finally {
		server.close();
	}
});
