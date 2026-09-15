import { ExternalServiceError } from "@oneglanse/errors";
import {
	PROVIDER_RESPONSE_GENERATION_SELECTORS,
	logger,
} from "@oneglanse/utils";
import { findActiveEditorCandidate } from "../../lib/input/editor/findEditor.js";
import { findEnabledSendButton } from "../../lib/input/editor/findSendButton.js";
import { normalizePromptValue } from "../../lib/input/editor/promptInput.js";
import { detectBotPage } from "../../lib/input/response/detectBotPage.js";
import type { PromptAttempt, PromptProgress } from "./promptAttempt.js";
import type { SubmitContext } from "./submitStrategies.js";

type SubmissionSnapshot = {
	url: string;
	userMessages: number;
	generating: boolean;
};

function conversationId(
	rawUrl: string,
	provider: SubmitContext["provider"],
): string | null {
	try {
		const url = new URL(rawUrl);
		if (provider === "qianwen" && url.hostname === "www.qianwen.com") {
			return /^\/chat\/([a-zA-Z0-9-]+)\/?$/.exec(url.pathname)?.[1] ?? null;
		}
		if (
			provider === "diandian" &&
			url.hostname === "www.xiaohongshu.com" &&
			url.pathname === "/ai_chat"
		) {
			return url.searchParams.get("conversationId");
		}
	} catch {}
	return null;
}

export function submissionAcknowledged(
	before: SubmissionSnapshot,
	after: SubmissionSnapshot,
	provider: SubmitContext["provider"],
	inputCleared: boolean,
): boolean {
	const id = conversationId(after.url, provider);
	if (id && id !== conversationId(before.url, provider)) return true;
	return (
		after.userMessages > before.userMessages &&
		(after.generating || inputCleared)
	);
}

async function snapshot(ctx: SubmitContext): Promise<SubmissionSnapshot> {
	return ctx.page.evaluate(
		({ userSelector, generationSelectors, prompt }) => {
			const visible = (node: Element) => {
				const style = getComputedStyle(node);
				return (
					node.getBoundingClientRect().width > 0 &&
					style.display !== "none" &&
					style.visibility !== "hidden"
				);
			};
			const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
			return {
				url: location.href,
				userMessages: Array.from(
					document.querySelectorAll(userSelector),
				).filter(
					(node) =>
						visible(node) &&
						normalize(node.textContent ?? "") === normalize(prompt),
				).length,
				generating: generationSelectors.some((selector) =>
					Array.from(document.querySelectorAll(selector)).some(visible),
				),
			};
		},
		{
			userSelector:
				ctx.provider === "qianwen"
					? ".message-card-wrap.question"
					: ".user-message__text",
			generationSelectors: PROVIDER_RESPONSE_GENERATION_SELECTORS[ctx.provider],
			prompt: ctx.preSubmitContent,
		},
	);
}

// Only a fresh conversation or an added user message acknowledges submission.
// Empty/temporarily hidden editors alone cannot authorize another send.
export async function submitWithConfirmation(
	ctx: SubmitContext,
	attempt: PromptAttempt,
	progress: PromptProgress,
): Promise<void> {
	const before = await snapshot(ctx);
	const startedAt = Date.now();
	for (const method of ["enter", "native"] as const) {
		attempt.check();
		const { locator: input } = await findActiveEditorCandidate(
			ctx.page,
			ctx.provider,
		);
		const value = await input.readInputValue();
		if (
			normalizePromptValue(value) !== normalizePromptValue(ctx.preSubmitContent)
		) {
			throw new ExternalServiceError(
				ctx.provider,
				"Typing failed: editor changed before submission",
			);
		}
		const button =
			method === "native"
				? await findEnabledSendButton(ctx.page, ctx.provider)
				: null;
		if (method === "native" && !button) break;
		attempt.check();
		// Until acknowledgement, even an action error may mean the request was sent.
		progress.uncertain = true;
		try {
			if (method === "enter") await input.press("Enter", { timeout: 5_000 });
			else await button!.click({ timeout: 5_000 });
		} catch {
			logger.warn(
				`[${ctx.provider}] ${method} action failed; checking acknowledgement before recovery`,
			);
		}
		const deadline = Date.now() + 12_000;
		let newlineInserted = false;
		do {
			attempt.check();
			const current = await snapshot(ctx);
			const liveValue = await input.readInputValue().catch(() => null);
			if (
				submissionAcknowledged(
					before,
					current,
					ctx.provider,
					liveValue !== null && normalizePromptValue(liveValue) === "",
				)
			) {
				progress.submitted = true;
				progress.uncertain = false;
				logger.log(
					`[${ctx.provider}] submission acknowledged via ${method} in ${Date.now() - startedAt}ms`,
				);
				return;
			}
			await detectBotPage(ctx.page, ctx.provider);
			// Enter inserting a line break is a local edit rather than a send. This
			// permits the native-button fallback; silence alone never does.
			newlineInserted =
				method === "enter" &&
				liveValue !== null &&
				liveValue.replace(/\r\n/g, "\n") ===
					`${value.replace(/\r\n/g, "\n")}\n` &&
				current.userMessages === before.userMessages &&
				current.url === before.url &&
				!current.generating;
			if (newlineInserted) break;
			await ctx.page.waitForTimeout(250);
		} while (Date.now() < deadline);
		if (!newlineInserted) {
			throw new ExternalServiceError(
				ctx.provider,
				"Submission acknowledgement uncertain; stopping to avoid duplicate submission",
			);
		}
		progress.uncertain = false;
	}
	throw new ExternalServiceError(
		ctx.provider,
		"Submission failed before dispatch: no usable send action",
	);
}
