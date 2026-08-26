import { ExternalServiceError } from "@oneglanse/errors";
import { resetProviderPage } from "../../_shared/resetProviderPage.js";
import type { ProviderConfig } from "../../types.js";

export const QIANWEN_URL = "https://www.qianwen.com/";

export function isQianwenLoginUrl(rawUrl: string): boolean {
	try {
		const url = new URL(rawUrl);
		const hostname = url.hostname.toLowerCase();
		const isQianwenDomain =
			hostname === "qianwen.com" ||
			hostname.endsWith(".qianwen.com") ||
			hostname === "tongyi.aliyun.com" ||
			hostname.endsWith(".tongyi.aliyun.com");
		if (!isQianwenDomain) return false;

		return /^\/(login|signin|sign-in|passport|auth)(\/|$)/i.test(url.pathname);
	} catch {
		return false;
	}
}

export async function assertQianwenSession(
	page: Parameters<ProviderConfig["waitForResponse"]>[0],
): Promise<void> {
	const url = await page.getUrl().catch(() => page.url());
	if (isQianwenLoginUrl(url)) {
		throw new ExternalServiceError(
			"qianwen",
			`session expired: redirected to login page (${url})`,
		);
	}
}

export async function qianwenPostNavigationHook(
	page: Parameters<NonNullable<ProviderConfig["postNavigationHook"]>>[0],
): Promise<void> {
	// 首页会先恢复历史会话和模型列表，过早定位编辑器容易拿到占位节点。
	await page.waitForTimeout(1200 + Math.floor(Math.random() * 900));
	await assertQianwenSession(page);
}

export async function resetQianwenPage(
	page: Parameters<ProviderConfig["waitForResponse"]>[0],
): Promise<void> {
	await resetProviderPage(page, "qianwen", QIANWEN_URL, {
		postNavigationHook: qianwenPostNavigationHook,
	});
}
