import { ExternalServiceError } from "@oneglanse/errors";
import { resetProviderPage } from "../../_shared/resetProviderPage.js";
import type { ProviderConfig } from "../../types.js";

export const KIMI_URL = "https://www.kimi.com/";

/**
 * Kimi 已从 kimi.moonshot.cn 迁移到 www.kimi.com。未登录时两个域名都
 * 可能落到登录路径(/login 或 /signin)。
 *
 * 这个信号不在 domOps 的通用登录检测里,所以必须在 provider 侧显式判断,
 * 否则会话过期会被误报成「editor for kimi not found」而触发无意义的重试
 * 和浏览器重启。
 */
export function isKimiLoginUrl(rawUrl: string): boolean {
	try {
		const url = new URL(rawUrl);
		const hostname = url.hostname.toLowerCase();
		if (
			hostname !== "kimi.com" &&
			!hostname.endsWith(".kimi.com") &&
			hostname !== "moonshot.cn" &&
			!hostname.endsWith(".moonshot.cn")
		) {
			return false;
		}
		return /^\/(login|signin)/i.test(url.pathname);
	} catch {
		return false;
	}
}

/**
 * 登录态断言。抛 ExternalServiceError 与 detectBotPage 的行为保持一致,
 * 让上层按「会话失效」处理。
 */
export async function assertKimiSession(
	page: Parameters<ProviderConfig["waitForResponse"]>[0],
): Promise<void> {
	const url = await page.getUrl().catch(() => page.url());
	if (isKimiLoginUrl(url)) {
		throw new ExternalServiceError(
			"kimi",
			`session expired: redirected to login page (${url})`,
		);
	}
}

export async function kimiPostNavigationHook(
	page: Parameters<NonNullable<ProviderConfig["postNavigationHook"]>>[0],
): Promise<void> {
	await page.waitForTimeout(900 + Math.floor(Math.random() * 800));
	await assertKimiSession(page);
}

export async function resetKimiPage(
	page: Parameters<ProviderConfig["waitForResponse"]>[0],
): Promise<void> {
	await resetProviderPage(page, "kimi", KIMI_URL, {
		postNavigationHook: kimiPostNavigationHook,
	});
}
