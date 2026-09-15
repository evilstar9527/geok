import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("known login and verification failures block saved sessions until reconnect", async () => {
	const root = await mkdtemp(path.join(os.tmpdir(), "geok-auth-test-"));
	process.env.AGENT_AUTH_ROOT_DIR = path.join(root, "auth");
	process.env.ONEGLANSE_STORAGE_ROOT = root;
	process.env.ONEGLANSE_APP_MODE = "self-host";
	const {
		saveAuthSession,
		readProviderAuthStatuses,
		hasRuntimeProviderAuth,
		writeProviderAuthStatus,
		readAuthSession,
	} = await import("../dist/agent/auth.js");
	const session = {
		cookies: [
			{ name: "session", value: "test", domain: ".deepseek.com", path: "/" },
		],
		origins: [],
	};
	try {
		await saveAuthSession("deepseek", session);
		assert.equal(await hasRuntimeProviderAuth("deepseek"), true);
		for (const actionRequired of ["login", "verification"]) {
			await writeProviderAuthStatus("deepseek", {
				actionRequired,
				connecting: false,
				lastUpdatedAt: new Date().toISOString(),
				syncedAt: null,
				error: "Action required",
			});
			assert.equal(await hasRuntimeProviderAuth("deepseek"), false);
			const status = (await readProviderAuthStatuses()).find(
				(s) => s.provider === "deepseek",
			);
			assert.equal(status.connected, false);
			assert.equal(status.actionRequired, actionRequired);
			assert.equal(status.error, "Action required");
			assert.ok(await readAuthSession("deepseek"), "session must be preserved");
			await writeProviderAuthStatus("deepseek", {
				connecting: false,
				lastUpdatedAt: new Date().toISOString(),
				syncedAt: null,
				error: "Login window failed to start",
			});
			assert.equal(
				await hasRuntimeProviderAuth("deepseek"),
				false,
				"failed reconnect must not clear the required action",
			);
			await saveAuthSession("deepseek", session);
			assert.equal(await hasRuntimeProviderAuth("deepseek"), true);
			assert.equal(
				(await readProviderAuthStatuses()).find(
					(s) => s.provider === "deepseek",
				).actionRequired,
				null,
			);
		}
		await writeProviderAuthStatus("deepseek", {
			connecting: false,
			lastUpdatedAt: null,
			syncedAt: null,
			error: "Upload temporarily unavailable",
		});
		assert.equal(
			await hasRuntimeProviderAuth("deepseek"),
			true,
			"unrelated errors do not disable authentication",
		);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
