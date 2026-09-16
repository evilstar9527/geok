import { ExternalServiceError } from "@oneglanse/errors";
import type { Provider } from "@oneglanse/types";
import {
	PROVIDER_FORCE_EXIT_STABLE_MS,
	PROVIDER_NO_OUTPUT_TIMEOUT_MS,
	logger,
} from "@oneglanse/utils";
import type { Page } from "playwright";
import {
	getGenerationStateSignature,
	getResponseStateSignature,
	hasVisibleGenerationIndicator,
} from "./isGenerating.js";

async function sleep(ms: number): Promise<void> {
	let timer: ReturnType<typeof setTimeout> | null = null;
	try {
		await new Promise<void>((resolve) => {
			timer = setTimeout(resolve, ms);
		});
	} finally {
		if (timer !== null) {
			clearTimeout(timer);
		}
	}
}

// Shared polling helper - DRY principle
async function pollUntilCondition(
	checkFn: () => Promise<boolean>,
	pollInterval: number,
	maxWait: number,
	timeoutError: ExternalServiceError,
): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < maxWait) {
		if (await checkFn()) return;
		await sleep(pollInterval);
	}
	throw timeoutError;
}

export async function waitForAssistantToFinish(
	page: Page,
	provider: Provider,
): Promise<void> {
	logger.debug(
		provider === "ai-overview"
			? "⏳ Waiting for AI Overview response container to stabilize…"
			: "⏳ Waiting for assistant to finish…",
	);
	const waitStart = Date.now();
	let lastGenerationState = "";
	let lastResponseState = "";
	let lastChangeAt = Date.now();
	let initialized = false;
	let seenResponse = false;

	await pollUntilCondition(
		async () => {
			const [
				currentGenerationState,
				currentResponseState,
				hasVisibleIndicator,
			] = await Promise.all([
				getGenerationStateSignature(page, provider),
				getResponseStateSignature(page, provider),
				hasVisibleGenerationIndicator(page, provider),
			]);
			const waitedFor = Date.now() - waitStart;
			const forceExitStableMs = PROVIDER_FORCE_EXIT_STABLE_MS[provider];
			const responseStateChanged =
				currentResponseState.signature !== lastResponseState;
			const generationStateChanged =
				currentGenerationState !== lastGenerationState;
			const requiresContainerStabilityOnly = provider === "ai-overview";

			if (!initialized) {
				lastGenerationState = currentGenerationState;
				lastResponseState = currentResponseState.signature;
				seenResponse = currentResponseState.textLength > 0;
				lastChangeAt = Date.now();
				initialized = true;
				return false;
			}

			if (currentResponseState.textLength > 0) {
				seenResponse = true;
			}

			if (responseStateChanged || generationStateChanged) {
				lastGenerationState = currentGenerationState;
				lastResponseState = currentResponseState.signature;
				lastChangeAt = Date.now();
				return false;
			}

			const stableFor = Date.now() - lastChangeAt;
			if (requiresContainerStabilityOnly) {
				if (seenResponse && stableFor >= 2500) {
					logger.debug("✅ AI Overview response container stabilized");
					return true;
				}
			}

			if (seenResponse && !hasVisibleIndicator && stableFor >= 1500) {
				logger.debug("✅ Assistant finished");
				return true;
			}

			const noOutputTimeoutMs = PROVIDER_NO_OUTPUT_TIMEOUT_MS[provider];

			// 一个字都还没出现时不能走 forceExit —— 没有任何回答可以抢救,提前退出
			// 只会拿到空提取。这种「还没开始输出」的情况归 noOutputTimeout 管,
			// 它本来就是为此存在的(元宝深度搜索会先花 50-70s 跑思维链和检索,
			// 期间正文容器压根不存在,两个 signature 都不变;按 45s 的 forceExit
			// 走,每一条都会在正文出现前退出并报 extraction empty)。
			if (!seenResponse) {
				if (waitedFor >= noOutputTimeoutMs) {
					logger.warn(
						`No response text within ${Math.round(noOutputTimeoutMs / 1000)}s — giving up on this attempt`,
					);
					return true;
				}
				return false;
			}

			if (stableFor >= forceExitStableMs) {
				logger.warn(
					`${hasVisibleIndicator ? "Generation indicator still visible and " : ""}generation state stable for ${Math.round(forceExitStableMs / 1000)}s — forcing exit`,
				);
				return true;
			}

			return false;
		},
		280 + Math.floor(Math.random() * 60), // Poll ~300ms with ±50ms jitter
		5 * 60 * 1000, // 5 min max — if a response hasn't arrived by then, something is wrong
		new ExternalServiceError(provider, "Assistant wait timed out"),
	);
}
