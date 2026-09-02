import { logger } from "@oneglanse/utils";
import { resetProviderPage } from "../../_shared/resetProviderPage.js";
import type { ProviderConfig } from "../../types.js";

export const DIANDIAN_URL = "https://www.xiaohongshu.com/ai_chat";

/**
 * 小红书登录多是弹窗式(扫码/手机号),不一定像豆包/千问那样跳转到独立的
 * /login 路径。这里先按同类 provider 的通用模式匹配路径,真实登录墙的
 * DOM 结构需要在本地登录后实测确认再收窄。
 */
export function isDiandianLoginUrl(rawUrl: string): boolean {
	try {
		const url = new URL(rawUrl);
		const hostname = url.hostname.toLowerCase();
		const isXiaohongshuDomain =
			hostname === "xiaohongshu.com" || hostname.endsWith(".xiaohongshu.com");
		if (!isXiaohongshuDomain) return false;

		return /^\/(login|signin|sign-in|passport)(\/|$)/i.test(url.pathname);
	} catch {
		return false;
	}
}

export async function assertDiandianSession(
	page: Parameters<ProviderConfig["waitForResponse"]>[0],
): Promise<void> {
	const url = await page.getUrl().catch(() => page.url());
	if (isDiandianLoginUrl(url)) {
		logger.warn(`[diandian] session expired — landed on login page: ${url}`);
	}
}

export async function diandianPostNavigationHook(
	page: Parameters<NonNullable<ProviderConfig["postNavigationHook"]>>[0],
): Promise<void> {
	await page.waitForTimeout(1200 + Math.floor(Math.random() * 900));
	await assertDiandianSession(page);
}

export async function resetDiandianPage(
	page: Parameters<ProviderConfig["waitForResponse"]>[0],
): Promise<void> {
	await resetProviderPage(page, "diandian", DIANDIAN_URL, {
		postNavigationHook: diandianPostNavigationHook,
	});
}
