import assert from "node:assert/strict";
import test from "node:test";
import { ExternalServiceError } from "@oneglanse/errors";
import { ProviderActionRequiredError } from "../dist/core/providerActionRequired.js";
import { executePromptWithRetry } from "../dist/core/prompt-runner/retryPolicy.js";
import { PROVIDER_CONFIGS } from "../dist/core/providers/index.js";
import {
	checkKimiSubmitSuccess,
	getKimiSubmissionBlocker,
} from "../dist/core/providers/kimi/lib/pageLifecycle.js";
import { runPrompts } from "../dist/core/prompt-runner/index.js";
import { runWithRetryCycles } from "../dist/lib/browser/proxy/runner.js";

test("execution gate admits ten tasks and releases slots after failures", async () => {
	const { env } = await import("../dist/env.js");
	env.PROVIDER_EXECUTION_CONCURRENCY = 10;
	const { runWithProviderExecutionGate } = await import(
		"../dist/worker/executionGate.js"
	);
	let active = 0;
	let peak = 0;
	let release;
	const barrier = new Promise((resolve) => {
		release = resolve;
	});
	const results = await Promise.allSettled(
		Array.from({ length: 24 }, (_, index) =>
			runWithProviderExecutionGate("kimi", async () => {
				active++;
				peak = Math.max(peak, active);
				if (active === 10) release();
				try {
					await barrier;
					if (index === 0) throw new Error("expected failure");
				} finally {
					active--;
				}
			}),
		),
	);
	assert.equal(peak, 10);
	assert.equal(active, 0);
	assert.equal(
		results.filter((result) => result.status === "rejected").length,
		1,
	);
});

test("the first challenge ends the batch and carries earlier responses to the job handler", async () => {
	const config = PROVIDER_CONFIGS.doubao;
	const original = config.navigateToPrompt;
	let attempts = 0;
	let launches = 0;
	const partial = [{ response: "previous successful response" }];
	const prompt = { id: "prompt", prompt: "test" };
	const payload = {
		user_id: "user",
		workspace_id: "workspace",
		prompts: [prompt, prompt],
	};
	const page = { waitForTimeout: async () => {} };
	config.navigateToPrompt = async () => {
		attempts++;
		throw new ExternalServiceError(
			"doubao",
			"bot detection: challenge UI present",
		);
	};
	try {
		await assert.rejects(
			runWithRetryCycles(
				"doubao",
				async () => {
					launches++;
					return {
						page,
						browser: { close: async () => {} },
						context: { close: async () => {} },
					};
				},
				payload,
				"doubao",
				{
					executor: async () => {
						await assert.rejects(
							executePromptWithRetry(
								page,
								prompt,
								"doubao",
								"user",
								"workspace",
								1,
								2,
								partial,
								[prompt],
								true,
							),
							(error) => {
								assert.ok(error instanceof ProviderActionRequiredError);
								assert.equal(error.actionRequired, "verification");
								assert.equal(error.partialResults, partial);
								throw error;
							},
						);
					},
				},
			),
			(error) => {
				assert.ok(error instanceof ProviderActionRequiredError);
				assert.deepEqual(error.partialResults, partial);
				return true;
			},
		);
		assert.equal(attempts, 1);
		assert.equal(launches, 1);
	} finally {
		config.navigateToPrompt = original;
	}
});

test("every stored prompt result reaches the caller once, as the object the run returns", async () => {
	const config = PROVIDER_CONFIGS.doubao;
	const original = {
		navigateToPrompt: config.navigateToPrompt,
		waitForResponse: config.waitForResponse,
		extractResponse: config.extractResponse,
		extractSources: config.extractSources,
		betweenPromptsHook: config.betweenPromptsHook,
	};
	let asked = 0;
	config.navigateToPrompt = async () => {
		asked += 1;
	};
	config.waitForResponse = async () => {};
	config.extractResponse = async () =>
		`answer number ${asked} with enough characters to pass validation`;
	config.extractSources = async () => [];
	config.betweenPromptsHook = async () => {};
	const page = {
		waitForLoadState: async () => {},
		waitForTimeout: async () => {},
	};
	const prompts = [
		{ id: "a", prompt: "first" },
		{ id: "b", prompt: "second" },
		{ id: "c", prompt: "third" },
	];
	try {
		const streamed = [];
		const results = await runPrompts(
			{ user_id: "user", workspace_id: "workspace", prompts },
			page,
			"doubao",
			undefined,
			undefined,
			async (result) => {
				streamed.push(result);
			},
		);
		assert.equal(results.length, 3);
		// Identity, not prompt id: a run with runCount > 1 repeats prompt ids, so
		// the job handler dedupes stored results by object identity.
		assert.deepEqual(
			streamed.map((result) => results.indexOf(result)),
			[0, 1, 2],
		);
		assert.equal(
			results.filter((result) => !streamed.includes(result)).length,
			0,
		);
	} finally {
		Object.assign(config, original);
	}
});

test("Kimi requires a new chat URL, not just a cleared editor", async () => {
	const page = {
		evaluate: async () => "New chat",
		getUrl: async () => "https://www.kimi.com/",
		waitForTimeout: async () => new Promise((r) => setTimeout(r, 150)),
	};
	assert.equal(
		await checkKimiSubmitSuccess(page, {
			preSubmitUrl: "https://www.kimi.com/",
		}),
		false,
	);
	page.getUrl = async () => "https://www.kimi.com/chat/new-chat";
	assert.equal(
		await checkKimiSubmitSuccess(page, {
			preSubmitUrl: "https://www.kimi.com/",
		}),
		true,
	);
});

test("Kimi membership dialog is terminal, ordinary upgrade navigation is not", async () => {
	assert.equal(getKimiSubmissionBlocker("Upgrade your plan"), null);
	const text =
		"Currently available to Moderato/Plus and higher-tier members. Upgrade your membership to enjoy more benefits.";
	assert.match(getKimiSubmissionBlocker(text), /membership required/);
	await assert.rejects(
		checkKimiSubmitSuccess(
			{
				getUrl: async () => "https://www.kimi.com/",
				evaluate: async () => text,
			},
			{ preSubmitUrl: "https://www.kimi.com/" },
		),
		/membership required/,
	);
});
