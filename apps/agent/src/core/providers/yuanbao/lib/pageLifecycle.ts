import { logger } from "@oneglanse/utils";
import { resetProviderPage } from "../../_shared/resetProviderPage.js";
import type { ProviderConfig } from "../../types.js";

export const YUANBAO_URL = "https://yuanbao.tencent.com/chat/";

/**
 * 元宝退出登录后会把 URL 重写成带 logout 参数的首页 —— 页面看起来正常
 * (输入框还在),但 prompt 提交后会被静默丢弃。
 *
 * 这个信号不在 domOps 的通用登录检测里,所以必须在 provider 侧显式判断,
 * 否则会话过期会被误报成「editor for yuanbao not found」而触发无意义的
 * 浏览器重启。
 */
export function isYuanbaoLoggedOutUrl(rawUrl: string): boolean {
	try {
		const url = new URL(rawUrl);
		if (!url.hostname.endsWith("yuanbao.tencent.com")) return false;
		return (
			url.searchParams.has("from_logout") ||
			url.searchParams.has("logout") ||
			url.searchParams.has("logged_out")
		);
	} catch {
		return false;
	}
}

/**
 * 登录态自检。未登录时留下警告日志,让上层按「需要重新认证」处理而不是
 * 当成 DOM 问题。
 */
export async function assertYuanbaoSession(
	page: Parameters<ProviderConfig["waitForResponse"]>[0],
): Promise<void> {
	const url = await page.getUrl().catch(() => page.url());
	if (isYuanbaoLoggedOutUrl(url)) {
		logger.warn(`[yuanbao] session expired — landed on logged-out page: ${url}`);
	}
}

export async function yuanbaoPostNavigationHook(
	page: Parameters<NonNullable<ProviderConfig["postNavigationHook"]>>[0],
): Promise<void> {
	// 元宝首页首屏有推荐位动画,过早输入会被重渲染打断。
	await page.waitForTimeout(1200 + Math.floor(Math.random() * 900));
	await assertYuanbaoSession(page);
}

/**
 * 元宝提交后会先把 URL 写成 `/chat/local_<随机数>` —— 这是前端在会话尚未落到
 * 服务端时用的临时 id。此时 DOM 里还没有任何回答容器,直接进入提取必然拿到空。
 *
 * 所以在这里显式等待 URL 收敛成真实会话 id 再放行。
 */
const YUANBAO_LOCAL_CHAT_RE = /\/chat\/local_/;
const SESSION_SETTLE_TIMEOUT_MS = 20_000;
const SESSION_SETTLE_POLL_MS = 250;

export async function yuanbaoAfterSubmitHook(
	page: Parameters<NonNullable<ProviderConfig["afterSubmitHook"]>>[0],
): Promise<void> {
	const start = Date.now();

	while (Date.now() - start < SESSION_SETTLE_TIMEOUT_MS) {
		const url = page.url();
		if (!YUANBAO_LOCAL_CHAT_RE.test(url)) {
			return;
		}
		await page.waitForTimeout(SESSION_SETTLE_POLL_MS);
	}

	// 超时不抛错:会话 id 落库慢不代表回答一定抓不到,交给 waitForResponse
	// 和提取阶段判定。但要留下日志,便于区分「提取器选错」和「压根没建会话」。
	logger.warn(
		`[yuanbao] conversation id still local_ after ${SESSION_SETTLE_TIMEOUT_MS}ms: ${page.url()}`,
	);
}

export async function resetYuanbaoPage(
	page: Parameters<ProviderConfig["waitForResponse"]>[0],
): Promise<void> {
	await resetProviderPage(page, "yuanbao", YUANBAO_URL, {
		postNavigationHook: yuanbaoPostNavigationHook,
	});
}
