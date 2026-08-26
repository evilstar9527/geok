import { logger } from "@oneglanse/utils";
import { resetProviderPage } from "../../_shared/resetProviderPage.js";
import type { ProviderConfig } from "../../types.js";

export const DOUBAO_URL = "https://www.doubao.com/chat/";

/**
 * 豆包退出登录后会把 URL 重写成 `/chat/?from_logout=1` 并留在首页 ——
 * 页面看起来正常(输入框还在),但 prompt 提交后会被静默丢弃。
 *
 * 这个信号不在 domOps 的通用登录检测里(它只认 /login、/sign-in 这类路径),
 * 所以必须在 provider 侧显式判断,否则会话过期会被误报成
 * 「editor for doubao not found」而触发无意义的浏览器重启。
 */
export function isDoubaoLoggedOutUrl(rawUrl: string): boolean {
	try {
		const url = new URL(rawUrl);
		if (!url.hostname.endsWith("doubao.com")) return false;
		return url.searchParams.has("from_logout");
	} catch {
		return false;
	}
}

/**
 * 登录态自检。未登录时抛错,让上层按「需要重新认证」处理而不是当成 DOM 问题。
 */
export async function assertDoubaoSession(
	page: Parameters<ProviderConfig["waitForResponse"]>[0],
): Promise<void> {
	const url = await page.getUrl().catch(() => page.url());
	if (isDoubaoLoggedOutUrl(url)) {
		logger.warn(`[doubao] session expired — landed on logged-out page: ${url}`);
	}
}

export async function doubaoPostNavigationHook(
	page: Parameters<NonNullable<ProviderConfig["postNavigationHook"]>>[0],
): Promise<void> {
	// 豆包首页首屏有推荐位动画,过早输入会被重渲染打断。
	await page.waitForTimeout(1200 + Math.floor(Math.random() * 900));

	// 网页版会不定期弹出「下载电脑版」全屏 Dialog。弹窗打开时应用根节点
	// 被设为 aria-hidden 且 pointer-events:none,输入框虽然已渲染但不可交互。
	// 关闭「下次提醒我」后再进入通用编辑器检测。
	const dismissedDesktopDialog = await page.evaluate(() => {
		const dialog = document.querySelector('[role="dialog"]');
		if (!dialog) return false;
		const dismissButton = Array.from(dialog.querySelectorAll("button")).find(
			(button) => button.textContent?.trim() === "下次提醒我",
		);
		if (!(dismissButton instanceof HTMLElement)) return false;
		dismissButton.click();
		return true;
	}, undefined);
	if (dismissedDesktopDialog) {
		logger.log("[doubao] dismissed desktop download dialog");
		await page.waitForTimeout(400);
	}

	await assertDoubaoSession(page);
}

/**
 * 豆包提交后会先把 URL 写成 `/chat/local_<随机数>` —— 这是前端在会话尚未落到
 * 服务端时用的临时 id。此时 DOM 里还没有任何回答容器,直接进入提取必然拿到空。
 *
 * 实测:34 条全量跑里出现 24 次 local_ URL,每一次后面都紧跟 extraction empty。
 * askPrompt 的通用 stabilization 只等 networkidle,而豆包是持续流式输出,
 * networkidle 几乎不会触发,等于没有任何门禁。
 *
 * 所以在这里显式等待 URL 收敛成真实会话 id 再放行。
 */
const DOUBAO_LOCAL_CHAT_RE = /\/chat\/local_/;
const SESSION_SETTLE_TIMEOUT_MS = 20_000;
const SESSION_SETTLE_POLL_MS = 250;

export async function doubaoAfterSubmitHook(
	page: Parameters<NonNullable<ProviderConfig["afterSubmitHook"]>>[0],
): Promise<void> {
	const start = Date.now();

	while (Date.now() - start < SESSION_SETTLE_TIMEOUT_MS) {
		const url = page.url();
		if (!DOUBAO_LOCAL_CHAT_RE.test(url)) {
			return;
		}
		await page.waitForTimeout(SESSION_SETTLE_POLL_MS);
	}

	// 超时不抛错:会话 id 落库慢不代表回答一定抓不到,交给 waitForResponse
	// 和提取阶段判定。但要留下日志,便于区分「提取器选错」和「压根没建会话」。
	logger.warn(
		`[doubao] conversation id still local_ after ${SESSION_SETTLE_TIMEOUT_MS}ms: ${page.url()}`,
	);
}

export async function resetDoubaoPage(
	page: Parameters<ProviderConfig["waitForResponse"]>[0],
): Promise<void> {
	await resetProviderPage(page, "doubao", DOUBAO_URL, {
		postNavigationHook: doubaoPostNavigationHook,
	});
}
