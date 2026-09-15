import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
	getProviderAccountId,
	parseProviderAccountId,
	withProviderAccount,
} from "../dist/agent/accountScope.js";
import { getQueueName } from "../dist/agent/queue.js";
import {
	getAuthSessionFile,
	getProviderProfileDir,
	getRuntimeProfileSeedPlan,
	hasRuntimeProviderAuth,
	markRuntimeProfileSeeded,
	readAuthLaunchSeedState,
	readAuthSession,
	resetProviderAuthData,
	saveAuthSession,
	saveReusableIdentitySessions,
	uploadAuthSession,
	writeProviderAuthStatus,
} from "../dist/agent/auth.js";

const session = (value) => ({
	cookies: [{ name: "session", value, domain: ".deepseek.com", path: "/" }],
	origins: [],
});

test("parallel accounts isolate saved sessions, profiles, identity seeds, and reset", async () => {
	const root = await mkdtemp(path.join(os.tmpdir(), "geok-accounts-"));
	process.env.AGENT_AUTH_ROOT_DIR = path.join(root, "auth");
	process.env.ONEGLANSE_APP_MODE = "self-host";
	try {
		await saveAuthSession("deepseek", session("legacy"));
		assert.equal(
			getAuthSessionFile("deepseek"),
			path.join(root, "auth/sessions/deepseek/deepseek-auth.json"),
		);
		const scopes = [
			"account-1",
			"account-2",
			"account-3",
			"account-4",
			"account-5",
		];
		const paths = await Promise.all(
			scopes.map((account) =>
				withProviderAccount(account, async () => {
					await saveAuthSession("deepseek", session(account));
					await new Promise((resolve) => setImmediate(resolve));
					assert.equal(getProviderAccountId(), account);
					assert.equal(
						(await readAuthSession("deepseek")).cookies[0].value,
						account,
					);
					const plan = await getRuntimeProfileSeedPlan("deepseek");
					assert.equal(plan.shouldBootstrap, true);
					await mkdir(plan.userDataDir, { recursive: true });
					await writeFile(path.join(plan.userDataDir, "marker"), account);
					await markRuntimeProfileSeeded("deepseek", plan.authStateHash);
					assert.equal(
						(await getRuntimeProfileSeedPlan("deepseek")).shouldBootstrap,
						false,
					);
					await saveReusableIdentitySessions({
						cookies: [
							{ name: "SID", value: account, domain: ".google.com", path: "/" },
						],
					});
					const seed = await readAuthLaunchSeedState("deepseek");
					assert.equal(
						seed.cookies.find((cookie) => cookie.name === "SID").value,
						account,
					);
					return plan.userDataDir;
				}),
			),
		);
		assert.equal(new Set(paths).size, scopes.length);
		assert.equal(getProviderAccountId(), "default");
		assert.equal(
			(await readAuthSession("deepseek")).cookies[0].value,
			"legacy",
		);
		await withProviderAccount("account-1", () =>
			writeProviderAuthStatus("deepseek", {
				actionRequired: "login",
				connecting: false,
				lastUpdatedAt: null,
				syncedAt: null,
				error: "Expired",
			}),
		);
		assert.equal(
			await withProviderAccount("account-1", () =>
				hasRuntimeProviderAuth("deepseek"),
			),
			false,
		);
		assert.equal(
			await withProviderAccount("account-2", () =>
				hasRuntimeProviderAuth("deepseek"),
			),
			true,
		);
		await withProviderAccount("account-1", () =>
			resetProviderAuthData("deepseek"),
		);
		assert.equal(
			await withProviderAccount("account-1", () => readAuthSession("deepseek")),
			null,
		);
		assert.equal(
			await withProviderAccount("account-2", () =>
				readFile(
					path.join(getProviderProfileDir("deepseek"), "marker"),
					"utf8",
				),
			),
			"account-2",
		);
		assert.equal(await hasRuntimeProviderAuth("deepseek"), true);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("queue names separate accounts while preserving legacy names and rejecting invalid IDs", () => {
	assert.equal(getQueueName("kimi"), "oneglanse-agent-web-kimi");
	assert.equal(
		withProviderAccount("account-1", () => getQueueName("kimi")),
		"oneglanse-agent-web-kimi-account-1",
	);
	assert.notEqual(
		getQueueName("kimi", "web", "account-1"),
		getQueueName("kimi", "web", "account-2"),
	);
	for (const invalid of ["../escape", "", "account-6", null]) {
		assert.throws(() => parseProviderAccountId(invalid));
		assert.throws(() => withProviderAccount(invalid, () => {}));
	}
});

test("failed scoped work does not leak identity to the caller", async () => {
	await assert.rejects(
		withProviderAccount("account-2", async () => {
			throw new Error("expected");
		}),
	);
	assert.equal(getProviderAccountId(), "default");
});

test("session upload preserves the selected account in its payload", async () => {
	const root = await mkdtemp(path.join(os.tmpdir(), "geok-account-upload-"));
	const previous = { ...process.env };
	const originalFetch = globalThis.fetch;
	process.env.AGENT_AUTH_ROOT_DIR = path.join(root, "auth");
	process.env.ONEGLANSE_APP_MODE = "local";
	process.env.AGENT_AUTH_UPLOAD_URL = "http://localhost/mock-upload";
	process.env.AGENT_AUTH_UPLOAD_TOKEN = "test-token";
	let uploaded;
	globalThis.fetch = async (_url, options) => {
		const { gunzipSync } = await import("node:zlib");
		uploaded = JSON.parse(gunzipSync(options.body).toString());
		return { ok: true };
	};
	try {
		await withProviderAccount("account-5", () =>
			uploadAuthSession("deepseek", session("third")),
		);
		assert.equal(uploaded.accountId, "account-5");
		assert.equal(uploaded.provider, "deepseek");
		assert.equal(uploaded.session.cookies[0].value, "third");
	} finally {
		globalThis.fetch = originalFetch;
		for (const key of [
			"AGENT_AUTH_ROOT_DIR",
			"ONEGLANSE_APP_MODE",
			"AGENT_AUTH_UPLOAD_URL",
			"AGENT_AUTH_UPLOAD_TOKEN",
		]) {
			if (previous[key] === undefined) delete process.env[key];
			else process.env[key] = previous[key];
		}
		await rm(root, { recursive: true, force: true });
	}
});
