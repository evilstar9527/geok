import { ExternalServiceError } from "@oneglanse/errors";
import { resetProviderPage } from "../../_shared/resetProviderPage.js";
import type { ProviderConfig } from "../../types.js";

export const DEEPSEEK_URL = "https://chat.deepseek.com/";

/**
 * 未登录访问 chat.deepseek.com 会被直接 302 到 `/sign_in`(下划线)。
 *
 * 注意:domOps.ts 的通用登录检测正则只覆盖 `/signin` 和 `/sign-in`(连字符),
 * **匹配不到 `/sign_in`** —— 已实测确认。若不在这里显式判断,会话过期会一路
 * 走到「editor for deepseek not found」,把认证问题伪装成 DOM 问题,
 * 触发无意义的重试和浏览器重启。
 */
export function isDeepseekLoginUrl(rawUrl: string): boolean {
	try {
		const url = new URL(rawUrl);
		if (!url.hostname.endsWith("deepseek.com")) return false;
		return /^\/sign[_-]?in/i.test(url.pathname);
	} catch {
		return false;
	}
}

/**
 * 登录态断言。抛 ExternalServiceError 与 detectBotPage 的行为保持一致,
 * 让上层按「会话失效」处理。
 */
export async function assertDeepseekSession(
	page: Parameters<ProviderConfig["waitForResponse"]>[0],
): Promise<void> {
	const url = await page.getUrl().catch(() => page.url());
	if (isDeepseekLoginUrl(url)) {
		throw new ExternalServiceError(
			"deepseek",
			`session expired: redirected to login page (${url})`,
		);
	}
}

export async function deepseekPostNavigationHook(
	page: Parameters<NonNullable<ProviderConfig["postNavigationHook"]>>[0],
): Promise<void> {
	await page.waitForTimeout(900 + Math.floor(Math.random() * 800));
	await assertDeepseekSession(page);
}

export async function resetDeepseekPage(
	page: Parameters<ProviderConfig["waitForResponse"]>[0],
): Promise<void> {
	await resetProviderPage(page, "deepseek", DEEPSEEK_URL, {
		postNavigationHook: deepseekPostNavigationHook,
	});
}
