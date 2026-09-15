import assert from "node:assert/strict";
import test from "node:test";
import { getProviderAccountId, withProviderAccount } from "@oneglanse/services";
import { handleJob } from "../dist/worker/jobHandler.js";

test("a job for another account is rejected before browser or database access", async () => {
	await assert.rejects(
		withProviderAccount("account-1", () =>
			handleJob({ data: { accountId: "account-2" } }),
		),
		/account does not match/,
	);
});

test("two browser accounts overlap and queued work retains its own account identity", async () => {
	const { env } = await import("../dist/env.js");
	env.PROVIDER_EXECUTION_CONCURRENCY = 2;
	const { runWithProviderExecutionGate } = await import(
		"../dist/worker/executionGate.js"
	);
	let active = 0;
	let peak = 0;
	let release;
	const barrier = new Promise((resolve) => {
		release = resolve;
	});
	const accounts = ["account-1", "account-2", "account-3", "default"];
	const observed = await Promise.all(
		accounts.map((account) =>
			withProviderAccount(account, () =>
				runWithProviderExecutionGate("qianwen", async () => {
					active++;
					peak = Math.max(peak, active);
					if (active === 2) release();
					await barrier;
					await new Promise((resolve) => setImmediate(resolve));
					const current = getProviderAccountId();
					active--;
					return current;
				}),
			),
		),
	);
	assert.equal(peak, 2);
	assert.deepEqual(observed, accounts);
	assert.equal(getProviderAccountId(), "default");
});
