import { IPRefreshNeededError, toErrorMessage } from "@oneglanse/errors";
import type {
	AskPromptResult,
	PromptPayload,
	Provider,
} from "@oneglanse/types";
import { logger } from "@oneglanse/utils";
import type { Page } from "playwright";
import { shouldUseProxyForProvider } from "../../env.js";
import { PROVIDER_CONFIGS } from "../providers/index.js";
import { executePromptWithRetry } from "./retryPolicy.js";

/**
 * Loops over all prompts in the payload and runs each through the retry policy.
 * Propagates IPRefreshNeededError immediately so the outer job handler can rotate the proxy.
 */
export async function runPrompts(
	payload: PromptPayload,
	page: Page,
	provider: Provider,
	onPromptProgress?: (current: number, total: number) => Promise<void>,
	signal?: AbortSignal,
): Promise<AskPromptResult[]> {
	const { user_id: userId, workspace_id: workspaceId, prompts: promptsArray } = payload;

	await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});

	const config = PROVIDER_CONFIGS[provider];
	const results: AskPromptResult[] = [];
	const useProxy = shouldUseProxyForProvider(provider);
	let proxyProven = !useProxy;

	for (let i = 0; i < promptsArray.length; i++) {
		// UI 停止后必须在这里退出。abort 只能打断「当前正在进行的那一次 attempt」,
		// 循环本身若不检查,会立刻起下一条 prompt —— 表现就是点了停止毫无反应,
		// 34 条一路跑到底。已累积的结果照常返回,由上层标记为 stopped。
		if (signal?.aborted) {
			logger.warn(
				`run stopped from UI — aborting before prompt ${i + 1}/${promptsArray.length} (${results.length} completed)`,
			);
			break;
		}

		const promptEntry = promptsArray[i];
		if (!promptEntry) {
			logger.error(`Prompt at index ${i} is undefined.`);
			continue;
		}

		const preview = promptEntry.prompt.slice(0, 60) + (promptEntry.prompt.length > 60 ? "..." : "");
		logger.log(`prompt ${i + 1}/${promptsArray.length} — "${preview}"`);

		await onPromptProgress?.(i + 1, promptsArray.length).catch(() => {});

		// IPRefreshNeededError propagates immediately for proxy rotation.
		// Any other terminal failure skips this prompt and preserves accumulated results.
		let executeResult: { result: AskPromptResult; proxyNowProven: boolean };
		try {
			executeResult = await executePromptWithRetry(
				page,
				promptEntry,
				provider,
				userId,
				workspaceId,
				i,
				promptsArray.length,
				results,
				promptsArray.slice(i),
				proxyProven,
				signal,
			);
		} catch (err) {
			if (err instanceof IPRefreshNeededError) throw err;
			logger.error(
				`prompt ${i + 1}/${promptsArray.length} failed permanently — skipping: ${toErrorMessage(err)}`,
			);
			continue;
		}
		const { result, proxyNowProven } = executeResult;

		results.push(result);
		if (proxyNowProven) proxyProven = true;

		const hasMorePrompts = i < promptsArray.length - 1;
		if (config.betweenPromptsHook && hasMorePrompts) {
			await config.betweenPromptsHook(page);
		}
	}

	logger.success(`all ${results.length}/${promptsArray.length} prompts completed`);
	return results;
}
