import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { AppiumClient } from "../dist/mobile/appiumClient.js";

test("uses W3C Appium session, clipboard, accessibility source and screenshot APIs", async () => {
	const requests = [];
	const server = createServer((request, response) => {
		requests.push(`${request.method} ${request.url}`);
		response.setHeader("content-type", "application/json");
		if (request.url === "/failure/status") {
			response.statusCode = 500;
			return response.end(
				JSON.stringify({
					value: {
						message:
							"failed at https://cloud.example/wd/hub Authorization: Bearer secret-token",
					},
				}),
			);
		}
		if (request.url === "/status")
			return response.end(
				JSON.stringify({ value: { build: { version: "2.0.0" } } }),
			);
		if (request.url === "/session" && request.method === "POST")
			return response.end(
				JSON.stringify({ value: { sessionId: "session-1" } }),
			);
		if (request.url === "/session/session-1/source")
			return response.end(
				JSON.stringify({ value: "<hierarchy><text>answer</text></hierarchy>" }),
			);
		if (request.url === "/session/session-1/screenshot")
			return response.end(JSON.stringify({ value: "cG5n" }));
		if (request.url === "/session/session-1/appium/device/get_clipboard")
			return response.end(
				JSON.stringify({
					value: Buffer.from("copied answer").toString("base64"),
				}),
			);
		return response.end(JSON.stringify({ value: null }));
	});
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	assert.ok(address && typeof address === "object");
	const client = new AppiumClient(`http://127.0.0.1:${address.port}`);
	try {
		assert.equal((await client.status()).build.version, "2.0.0");
		await client.createSession({ platformName: "Android" });
		assert.match(await client.source(), /answer/);
		assert.equal(await client.clipboard(), "copied answer");
		await client.setClipboard("");
		assert.equal(await client.screenshot(), "cG5n");
		await client.close();
		assert.ok(
			requests.includes("POST /session/session-1/appium/device/set_clipboard"),
		);
		assert.ok(requests.includes("DELETE /session/session-1"));
		const failingClient = new AppiumClient(
			`http://127.0.0.1:${address.port}/failure`,
		);
		await assert.rejects(failingClient.status(), (error) => {
			assert.doesNotMatch(error.message, /cloud\.example|secret-token/);
			assert.match(error.message, /redacted/);
			return true;
		});
	} finally {
		server.close();
	}
});
