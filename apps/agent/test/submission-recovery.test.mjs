import assert from "node:assert/strict";
import test from "node:test";
import { ExternalServiceError, IPRefreshNeededError } from "@oneglanse/errors";
import { PromptAttempt } from "../dist/core/steps/promptAttempt.js";
import {
	submissionAcknowledged,
	submitWithConfirmation,
} from "../dist/core/steps/confirmedSubmit.js";
import { PROVIDER_CONFIGS } from "../dist/core/providers/index.js";
import { executePromptWithRetry } from "../dist/core/prompt-runner/retryPolicy.js";

test("expired attempt settles its in-flight operation and blocks a late send", async () => {
	const attempt = new PromptAttempt();
	let settled = false;
	let sent = false;
	await assert.rejects(
		attempt.run(
			"prepare",
			async () => {
				await new Promise((resolve) => setTimeout(resolve, 25));
				settled = true;
				attempt.check();
				sent = true;
			},
			5,
		),
		/timed out/,
	);
	assert.equal(settled, true);
	assert.equal(sent, false);
	await assert.rejects(
		attempt.run(
			"fallback",
			async () => {
				sent = true;
			},
			100,
		),
		/timed out/,
	);
	assert.equal(sent, false);
	assert.equal(
		await new PromptAttempt().run("new attempt", async () => "ok", 100),
		"ok",
	);
});

test("acknowledgement ignores old messages, cleared editors and unrelated redirects", () => {
	const before = {
		url: "https://www.qianwen.com/",
		userMessages: 1,
		generating: false,
	};
	assert.equal(submissionAcknowledged(before, before, "qianwen", true), false);
	assert.equal(
		submissionAcknowledged(
			before,
			{ ...before, url: "https://www.qianwen.com/login" },
			"qianwen",
			true,
		),
		false,
	);
	assert.equal(
		submissionAcknowledged(
			before,
			{ ...before, url: "https://other.example/chat/abc" },
			"qianwen",
			true,
		),
		false,
	);
	assert.equal(
		submissionAcknowledged(
			before,
			{ ...before, url: "https://www.qianwen.com/chat/new-id" },
			"qianwen",
			false,
		),
		true,
	);
	assert.equal(
		submissionAcknowledged(
			before,
			{ ...before, userMessages: 2, generating: true },
			"qianwen",
			false,
		),
		true,
	);
	assert.equal(
		submissionAcknowledged(
			before,
			{ ...before, generating: true },
			"qianwen",
			false,
		),
		false,
	);
	const diandian = {
		...before,
		url: "https://www.xiaohongshu.com/ai_chat?conversationId=old",
	};
	assert.equal(
		submissionAcknowledged(
			diandian,
			{
				...diandian,
				url: "https://www.xiaohongshu.com/ai_chat?conversationId=new",
			},
			"diandian",
			false,
		),
		true,
	);
});

function submissionPage(
	t,
	{
		ackAt = Infinity,
		clearAt = Infinity,
		newline = false,
		actionError = false,
	} = {},
) {
	let now = 0;
	t.mock.method(Date, "now", () => now);
	let sends = 0;
	let clicks = 0;
	let value = "Question";
	const editor = {
		count: async () => 1,
		nth() {
			return this;
		},
		isVisible: async () => true,
		isEnabled: async () => true,
		boundingBox: async () => ({ x: 0, y: 0, width: 400, height: 60 }),
		scrollIntoViewIfNeeded: async () => {},
		focus: async () => {},
		getEditableState: async () => ({
			connected: true,
			visible: true,
			editable: true,
			enabled: true,
		}),
		readInputValue: async () => (now >= clearAt ? "" : value),
		press: async () => {
			sends++;
			if (newline) value += "\n";
			if (actionError) throw new Error("action completion timed out");
		},
		click: async () => {
			clicks++;
		},
	};
	const page = {
		locator: () => editor,
		waitForTimeout: async (ms) => {
			now += ms;
		},
		runDomOp: async () => ({ botDetected: false }),
		evaluate: async () => ({
			url:
				sends && (now >= ackAt || clicks)
					? "https://www.qianwen.com/chat/new"
					: "https://www.qianwen.com/",
			userMessages: sends && (now >= ackAt || clicks) ? 1 : 0,
			generating: false,
		}),
	};
	return {
		ctx: {
			page,
			provider: "qianwen",
			input: editor,
			sendButton: editor,
			preSubmitContent: "Question",
			preSubmitUrl: "https://www.qianwen.com/",
		},
		counts: () => ({ sends, clicks, now }),
	};
}

test("delayed acknowledgement waits without a second send or page refresh", async (t) => {
	const { ctx, counts } = submissionPage(t, { ackAt: 2_500 });
	const progress = { submitted: false, uncertain: false };
	await submitWithConfirmation(ctx, new PromptAttempt(), progress);
	assert.equal(progress.submitted, true);
	assert.equal(progress.uncertain, false);
	assert.deepEqual(counts(), { sends: 1, clicks: 0, now: 2_500 });
});

test("an action error followed by acknowledgement does not dispatch a fallback", async (t) => {
	const { ctx, counts } = submissionPage(t, {
		ackAt: 1_000,
		actionError: true,
	});
	const progress = { submitted: false, uncertain: false };
	await submitWithConfirmation(ctx, new PromptAttempt(), progress);
	assert.equal(progress.submitted, true);
	assert.equal(counts().sends, 1);
	assert.equal(counts().clicks, 0);
});

test("an editor cleared without acknowledgement remains uncertain and is not resent", async (t) => {
	const { ctx, counts } = submissionPage(t, { clearAt: 500 });
	const progress = { submitted: false, uncertain: false };
	await assert.rejects(
		submitWithConfirmation(ctx, new PromptAttempt(), progress),
		/uncertain/,
	);
	assert.equal(progress.submitted, false);
	assert.equal(progress.uncertain, true);
	assert.equal(counts().sends, 1);
	assert.equal(counts().clicks, 0);
});

test("Enter inserting a newline permits one native-button fallback", async (t) => {
	const { ctx, counts } = submissionPage(t, { newline: true });
	const progress = { submitted: false, uncertain: false };
	await submitWithConfirmation(ctx, new PromptAttempt(), progress);
	assert.equal(progress.submitted, true);
	assert.equal(counts().sends, 1);
	assert.equal(counts().clicks, 1);
});

async function retryPrompt(provider = "qianwen", partial = []) {
	return executePromptWithRetry(
		{ waitForTimeout: async () => {} },
		{ id: "p", prompt: "Question" },
		provider,
		"u",
		"w",
		0,
		1,
		partial,
		[{ id: "p", prompt: "Question" }],
		true,
	);
}

test("pre-submit failure retries locally before refreshing the page", async () => {
	const config = PROVIDER_CONFIGS.qianwen;
	const original = { ...config };
	let attempts = 0;
	let refreshes = 0;
	config.navigateToPrompt = async () => {
		attempts++;
		if (attempts === 1) throw new Error("Typing failed: editor rerendered");
	};
	config.beforeRetryHook = async () => {
		refreshes++;
	};
	config.waitForResponse = async () => {};
	config.extractResponse = async () =>
		"A complete response with enough detail for validation. ".repeat(4);
	config.extractSources = async () => [];
	try {
		await retryPrompt();
		assert.equal(attempts, 2);
		assert.equal(refreshes, 0);
	} finally {
		Object.assign(config, original);
		delete config.navigateToPrompt;
	}
});

test("response and source failures resume their stage without refreshing or resubmitting", async () => {
	const config = PROVIDER_CONFIGS.qianwen;
	const original = { ...config };
	let sends = 0,
		refreshes = 0,
		responses = 0,
		sources = 0;
	config.navigateToPrompt = async () => {
		sends++;
	};
	config.beforeRetryHook = async () => {
		refreshes++;
	};
	config.waitForResponse = async () => {};
	config.extractResponse = async () => {
		responses++;
		if (responses === 1)
			throw new ExternalServiceError(
				"qianwen",
				"Markdown response extraction failed",
			);
		return "This is a complete response with enough useful detail to validate successfully. ".repeat(
			4,
		);
	};
	config.extractSources = async () => {
		sources++;
		if (sources === 1) throw new Error("Execution context was destroyed");
		return [];
	};
	try {
		const result = await retryPrompt();
		assert.ok(result.result.response.length > 100);
		assert.deepEqual(
			{ sends, refreshes, responses, sources },
			{ sends: 1, refreshes: 0, responses: 2, sources: 2 },
		);
	} finally {
		Object.assign(config, original);
		delete config.navigateToPrompt;
	}
});

test("exhausted post-submit failures preserve partial results without browser rotation", async () => {
	const config = PROVIDER_CONFIGS.diandian;
	const original = { ...config };
	let sends = 0,
		refreshes = 0;
	config.navigateToPrompt = async () => {
		sends++;
	};
	config.beforeRetryHook = async () => {
		refreshes++;
	};
	config.waitForResponse = async () => {
		throw new Error("Response wait timed out");
	};
	const partial = [{ response: "Earlier result" }];
	try {
		await assert.rejects(retryPrompt("diandian", partial), (error) => {
			assert.ok(error instanceof IPRefreshNeededError);
			assert.equal(error.partialResults, partial);
			assert.deepEqual(error.remainingPrompts, []);
			return true;
		});
		assert.equal(sends, 1);
		assert.equal(refreshes, 0);
	} finally {
		Object.assign(config, original);
		delete config.navigateToPrompt;
	}
});
