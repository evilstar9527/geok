import {
	IPRefreshNeededError,
	ValidationError,
	classifyError,
	toErrorMessage,
} from "@oneglanse/errors";
import type {
	AskPromptResult,
	PromptPayload,
	Provider,
} from "@oneglanse/types";
import { exponentialBackoff, logger } from "@oneglanse/utils";
import type { Page } from "playwright";
import { shouldUseProxyForProvider } from "../../env.js";
import { StopProviderRunError } from "../../lib/browser/proxy/runner.js";
import { PROVIDER_CONFIGS } from "../providers/index.js";
import { executePrompt } from "./executePrompt.js";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1_000;
const MAX_RETRY_DELAY = 5_000;
const CANARY_ROTATE_FAILURES = new Set([
	"bot_detection",
	"connection_error",
	"rate_limited",
	// True editor absence on the first canary attempt usually means the page or
	// session is unusable; submit-path failures retry locally first.
	"no_editor",
]);
const REFRESH_ON_RETRY_FAILURES = new Set([
	"submission_failed",
	"no_editor",
	"timeout",
	// extraction_failed 不在此列:提取失败通常意味着 selector 与当前 DOM 不匹配,
	// 属于代码问题而非页面状态问题。刷新重试改不了结果,只会对同一个账号连续打
	// 无效请求(实测 34 条 prompt 因此产生 20+ 次多余加载,最终拖崩浏览器)。
]);

// Identifies extraction and validation failures that warrant a log warning.
const EXTRACTION_FAILURE_RE =
	/Markdown response extraction failed|Empty response extracted|Invalid response/i;

function buildIPRotationError(
	message: string,
	partialResults: AskPromptResult[],
	remainingPrompts: PromptPayload["prompts"],
	failedPromptIndex: number,
	err: unknown,
): IPRefreshNeededError {
	return new IPRefreshNeededError(
		message,
		partialResults,
		remainingPrompts,
		failedPromptIndex,
		classifyError(err),
	);
}

function shouldRotateImmediatelyOnUnprovenProxy(
	failureType: ReturnType<typeof classifyError>,
): boolean {
	return CANARY_ROTATE_FAILURES.has(failureType);
}

/**
 * Runs a single prompt through the retry loop with the canary proxy policy applied.
 *
 * Canary policy:
 *   - Unproven proxy + network/bot/rate-limit failure → immediate IP rotation.
 *   - Unproven proxy + local UI/extraction failure    → retry locally up to MAX_RETRIES.
 *   - Proven proxy                                    → up to MAX_RETRIES attempts.
 *
 *
 * Throws IPRefreshNeededError on terminal failure so the caller can rotate the proxy.
 */
export async function executePromptWithRetry(
	page: Page,
	promptEntry: NonNullable<PromptPayload["prompts"][number]>,
	provider: Provider,
	userId: string,
	workspaceId: string,
	promptIndex: number,
	totalPrompts: number,
	partialResults: AskPromptResult[],
	remainingPrompts: PromptPayload["prompts"],
	proxyProven: boolean,
	signal?: AbortSignal,
): Promise<{ result: AskPromptResult; proxyNowProven: boolean }> {
	const config = PROVIDER_CONFIGS[provider];
	const useProxy = shouldUseProxyForProvider(provider);
	const maxAttempts = MAX_RETRIES;
	let lastError: unknown = null;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		// 停止后不要再重试:退避最长可达数十秒,期间 UI 看起来完全卡死。
		if (signal?.aborted) {
			throw new StopProviderRunError(provider);
		}

		if (attempt > 1) {
			const backoffDelay = exponentialBackoff(
				attempt - 2,
				INITIAL_RETRY_DELAY,
				MAX_RETRY_DELAY,
			);
			logger.log(
				`retry ${attempt}/${maxAttempts} for prompt ${promptIndex + 1} (backoff ${backoffDelay / 1000}s)`,
			);
			await page.waitForTimeout(backoffDelay);
		}

		try {
			const { response, sources } = await executePrompt(
				page,
				promptEntry.prompt,
				provider,
			);

			logger.success(
				`prompt ${promptIndex + 1}/${totalPrompts} done${attempt > 1 ? ` (attempt ${attempt})` : ""}`,
			);

			const result: AskPromptResult = {
				userId,
				workspaceId,
				promptId: promptEntry.id,
				prompt: promptEntry.prompt,
				response,
				sources,
			};

			const proxyNowProven = useProxy && !proxyProven;
			if (proxyNowProven) {
				logger.log("proxy proven — full retries enabled for remaining prompts");
			}

			return { result, proxyNowProven };
		} catch (err) {
			lastError = err;
			const failureType = classifyError(err);

			if (failureType === "logged_out") {
				logger.warn(
					`session expired for prompt ${promptIndex + 1} — aborting provider run (not a proxy issue)`,
				);
				throw err;
			}

			logger.error(
				`attempt ${attempt}/${maxAttempts} failed for prompt ${promptIndex + 1}: ${toErrorMessage(err)}`,
			);

			if (
				attempt < maxAttempts &&
				config.beforeRetryHook &&
				REFRESH_ON_RETRY_FAILURES.has(failureType)
			) {
				logger.warn(
					`refreshing ${provider} page before retry due to ${failureType}`,
				);
				await config.beforeRetryHook(page);
			}

			if (
				useProxy &&
				!proxyProven &&
				shouldRotateImmediatelyOnUnprovenProxy(failureType)
			) {
				logger.warn(
					`canary failed on unproven proxy with ${failureType} — rotating IP immediately`,
				);
				throw buildIPRotationError(
					`${provider} canary prompt failed — rotating IP. Error: ${toErrorMessage(lastError)}`,
					partialResults,
					remainingPrompts,
					promptIndex,
					lastError,
				);
			}

			if (useProxy && !proxyProven && attempt === 1) {
				logger.warn(
					`canary failed on unproven proxy with ${failureType}, retrying locally before rotating IP`,
				);
			}

			if (EXTRACTION_FAILURE_RE.test(toErrorMessage(err))) {
				logger.warn(
					`repeated extraction failure on current ${useProxy ? "IP" : "session"} (prompt ${promptIndex + 1}, attempt ${attempt}/${maxAttempts})`,
				);
			}

			if (attempt === maxAttempts) {
				if (!useProxy) {
					logger.error(
						`prompt ${promptIndex + 1} exhausted ${maxAttempts} attempts`,
					);
					throw err;
				}
				logger.error(
					`prompt ${promptIndex + 1} exhausted ${maxAttempts} attempts — triggering IP refresh`,
				);
				throw buildIPRotationError(
					`${provider} failed ${maxAttempts} consecutive attempts — refreshing IP. Last error: ${toErrorMessage(lastError)}`,
					partialResults,
					remainingPrompts,
					promptIndex,
					lastError,
				);
			}
		}
	}

	// Unreachable — the loop always returns or throws.
	throw new ValidationError(
		"executePromptWithRetry: unexpected exit without result or error",
	);
}
