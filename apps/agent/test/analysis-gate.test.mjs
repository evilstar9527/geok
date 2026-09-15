import assert from "node:assert/strict";
import test from "node:test";
import { runWithAnalysisGate } from "../dist/worker/analysisGate.js";

function deferred() {
	let resolve;
	const promise = new Promise((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

test("two analysis scopes overlap while a third waits for a released slot", async () => {
	const release = deferred();
	const twoStarted = deferred();
	const started = [];
	let active = 0;
	let peak = 0;
	const jobs = ["a", "b", "c", "d"].map((scope) =>
		runWithAnalysisGate(scope, async () => {
			started.push(scope);
			active++;
			peak = Math.max(peak, active);
			if (started.length === 2) twoStarted.resolve();
			await release.promise;
			active--;
		}),
	);
	await twoStarted.promise;
	assert.deepEqual(started, ["a", "b"]);
	release.resolve();
	await Promise.all(jobs);
	assert.equal(peak, 2);
	assert.equal(active, 0);
	assert.deepEqual(started, ["a", "b", "c", "d"]);
});

test("same-scope work waits without blocking another scope or dropping later responses", async () => {
	const release = deferred();
	const otherStarted = deferred();
	const rows = ["first"];
	const analysed = [];
	let sameScopeActive = 0;
	const first = runWithAnalysisGate("same", async () => {
		sameScopeActive++;
		const selected = rows.splice(0);
		await release.promise;
		analysed.push(...selected);
		sameScopeActive--;
	});
	const second = runWithAnalysisGate("same", async () => {
		assert.equal(sameScopeActive, 0);
		analysed.push(...rows.splice(0));
	});
	const other = runWithAnalysisGate("other", async () => {
		assert.equal(sameScopeActive, 1);
		rows.push("arrived during analysis");
		otherStarted.resolve();
	});
	await otherStarted.promise;
	assert.deepEqual(analysed, []);
	release.resolve();
	await Promise.all([first, second, other]);
	assert.deepEqual(analysed, ["first", "arrived during analysis"]);
});

test("a failed analysis releases its slot and does not poison subsequent scope work", async () => {
	let finished = 0;
	const failing = runWithAnalysisGate("failure", async () => {
		throw new Error("expected failure");
	});
	const sameScope = runWithAnalysisGate("failure", async () => {
		finished++;
	});
	const otherScopes = ["next-a", "next-b", "next-c"].map((scope) =>
		runWithAnalysisGate(scope, async () => {
			finished++;
		}),
	);
	const results = await Promise.allSettled([
		failing,
		sameScope,
		...otherScopes,
	]);
	assert.equal(results.filter((r) => r.status === "rejected").length, 1);
	assert.equal(finished, 4);
});
