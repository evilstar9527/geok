import assert from "node:assert/strict";
import test from "node:test";
import { ExternalServiceError } from "@oneglanse/errors";
import { ProviderActionRequiredError } from "../dist/core/providerActionRequired.js";
import { runWithRetryCycles } from "../dist/lib/browser/proxy/runner.js";
import { executePromptWithRetry } from "../dist/core/prompt-runner/retryPolicy.js";
import { runPrompts } from "../dist/core/prompt-runner/index.js";
import { PROVIDER_CONFIGS } from "../dist/core/providers/index.js";
import {
	doubaoAfterSubmitHook,
	assertDoubaoSession,
} from "../dist/core/providers/doubao/lib/pageLifecycle.js";
import { waitForEditorReady } from "../dist/lib/input/editor/waitForReady.js";

const payload = {
	user_id: "u",
	workspace_id: "w",
	prompts: [
		{ id: "p1", prompt: "Question" },
		{ id: "p2", prompt: "Another" },
	],
};

test("expired login during browser setup reaches the handler without another launch", async () => {
	let launches = 0;
	await assert.rejects(
		runWithRetryCycles(
			"deepseek",
			async () => {
				launches++;
				throw new ExternalServiceError(
					"deepseek",
					"session expired: redirected to login page",
				);
			},
			payload,
			"deepseek",
		),
		(error) => {
			assert.ok(error instanceof ProviderActionRequiredError);
			assert.equal(error.actionRequired, "login");
			return true;
		},
	);
	assert.equal(launches, 1);
});

test("expired login during a prompt is not retried and does not start the next prompt", async () => {
	const config = PROVIDER_CONFIGS.deepseek;
	const old = config.navigateToPrompt;
	let attempts = 0;
	config.navigateToPrompt = async () => {
		attempts++;
		throw new ExternalServiceError("deepseek", "session expired");
	};
	try {
		await assert.rejects(
			runPrompts(payload, { waitForLoadState: async () => {} }, "deepseek"),
			ProviderActionRequiredError,
		);
		assert.equal(attempts, 1);
		const partial = [{ response: "Saved earlier answer" }];
		await assert.rejects(
			executePromptWithRetry(
				{},
				payload.prompts[1],
				"deepseek",
				"u",
				"w",
				1,
				2,
				partial,
				[payload.prompts[1]],
				true,
			),
			(error) => {
				assert.equal(error.partialResults, partial);
				return true;
			},
		);
	} finally {
		config.navigateToPrompt = old;
	}
});

test("terminal errors clean up the active browser before propagating", async () => {
	let closes = 0;
	let cleanups = 0;
	await assert.rejects(
		runWithRetryCycles(
			"doubao",
			async () => ({
				page: {},
				browser: {},
				context: { close: async () => closes++ },
				cleanup: async () => cleanups++,
			}),
			payload,
			"doubao",
			{
				executor: async () => {
					throw new ProviderActionRequiredError(
						"doubao",
						"verification",
						"challenge",
					);
				},
			},
		),
		ProviderActionRequiredError,
	);
	assert.equal(closes, 1);
	assert.equal(cleanups, 1);
});

test("Doubao detects a challenge before waiting for a local conversation to settle", async () => {
	let waits = 0;
	await assert.rejects(
		doubaoAfterSubmitHook({
			url: () => "https://www.doubao.com/chat/local_123",
			runDomOp: async () => ({
				botDetected: true,
				reason: "bot detection: challenge UI present",
			}),
			waitForTimeout: async () => waits++,
		}),
		/challenge UI present/,
	);
	assert.equal(waits, 0);
	await assert.rejects(
		assertDoubaoSession({
			getUrl: async () => "https://www.doubao.com/chat/?from_logout=1",
		}),
		/session expired/,
	);
});

test("Qianwen uses its visible Slate editor without waiting for a missing textarea", async () => {
	const selectors = [];
	const editor = {
		count: async () => 1,
		nth() {
			return this;
		},
		isVisible: async () => true,
		boundingBox: async () => ({ width: 500, height: 60 }),
		scrollIntoViewIfNeeded: async () => {},
		focus: async () => {},
		getEditableState: async () => ({
			connected: true,
			visible: true,
			editable: true,
			enabled: true,
			acceptsTextInput: true,
		}),
	};
	const result = await waitForEditorReady(
		{
			waitForLoadState: async () => {},
			waitForTimeout: async () => {},
			locator(selector) {
				selectors.push(selector);
				return editor;
			},
		},
		"qianwen",
	);
	assert.equal(result, editor);
	assert.ok(selectors.every((s) => s.includes('data-slate-editor="true"')));
});
