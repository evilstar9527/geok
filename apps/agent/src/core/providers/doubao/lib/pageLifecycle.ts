import { logger } from "@oneglanse/utils";
import { detectBotPage } from "../../../../lib/input/response/detectBotPage.js";
import { resetProviderPage } from "../../_shared/resetProviderPage.js";
import type { ProviderConfig } from "../../types.js";

export const DOUBAO_URL = "https://www.doubao.com/chat/";

const delayedDialogCheckedPages = new WeakSet<object>();

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

	// 网页版会不定期延迟弹出「下载电脑版」全屏 Dialog。弹窗打开时应用根节点
	// 被设为 aria-hidden 且 pointer-events:none,输入框虽然已渲染但不可交互。
	// 等待编辑器正常就绪或弹窗出现；弹窗出现后点击「下次提醒我」。
	const shouldWatchForDelayedDialog = !delayedDialogCheckedPages.has(page);
	const dialogDeadline = Date.now() + 8_000;
	while (Date.now() < dialogDeadline) {
		const state = await page.evaluate(() => {
			const dialog = document.querySelector('[role="dialog"]');
			const dismissButton = dialog
				? Array.from(dialog.querySelectorAll("button")).find(
						(button) => button.textContent?.trim() === "下次提醒我",
					)
				: null;
			if (dismissButton instanceof HTMLElement) {
				dismissButton.click();
				return "dismissed";
			}

			const editor = document.querySelector(
				'div.tiptap.ProseMirror[contenteditable="true"]',
			);
			if (editor instanceof HTMLElement) {
				const rect = editor.getBoundingClientRect();
				const blocked = Array.from(
					document.querySelectorAll('[aria-hidden="true"]'),
				).some((element) => element.contains(editor));
				if (!blocked && rect.width > 0 && rect.height > 0) return "ready";
			}

			return "waiting";
		}, undefined);

		if (state === "dismissed") {
			logger.log("[doubao] dismissed desktop download dialog");
			delayedDialogCheckedPages.add(page);
			await page.waitForTimeout(400);
			break;
		}
		// 首次打开豆包时，编辑器会先可用，随后才出现下载弹窗。不能在刚看到
		// 编辑器时立即返回，否则弹窗会在 prompt 输入前把 editor 设为
		// pointer-events:none。后续同一页面已完成过延迟观察，可快速返回。
		if (state === "ready" && !shouldWatchForDelayedDialog) break;
		await page.waitForTimeout(200);
	}
	delayedDialogCheckedPages.add(page);

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
const RESPONSE_START_TIMEOUT_MS = 8_000;

export async function doubaoAfterSubmitHook(
	page: Parameters<NonNullable<ProviderConfig["afterSubmitHook"]>>[0],
): Promise<void> {
	const start = Date.now();
	let sessionSettled = false;

	while (Date.now() - start < SESSION_SETTLE_TIMEOUT_MS) {
		const url = page.url();
		if (!DOUBAO_LOCAL_CHAT_RE.test(url)) {
			sessionSettled = true;
			break;
		}
		await page.waitForTimeout(SESSION_SETTLE_POLL_MS);
	}

	// 超时不抛错:会话 id 落库慢不代表回答一定抓不到,交给 waitForResponse
	// 和提取阶段判定。但要留下日志,便于区分「提取器选错」和「压根没建会话」。
	if (!sessionSettled) {
		logger.warn(
			`[doubao] conversation id still local_ after ${SESSION_SETTLE_TIMEOUT_MS}ms: ${page.url()}`,
		);
		// 豆包的安全验证是在 completion 请求后才动态插入 iframe，提交前的
		// 通用检测看不到。这里重新检测，避免把验证码误报成「回答为空」。
		await detectBotPage(page, "doubao");
	}

	// 用户问题和助手回答都使用 md-box-root。若直接进入通用稳定性检测,
	// 第一条用户问题会被误认为已有回答,导致复杂回答尚未开始渲染就提前提取。
	const responseStart = Date.now();
	while (Date.now() - responseStart < RESPONSE_START_TIMEOUT_MS) {
		const hasAssistantResponse = await page.evaluate(() => {
			const messageBoxes = Array.from(
				document.querySelectorAll("div.md-box-root"),
			);
			const assistantBox = messageBoxes.at(-1);
			return (
				messageBoxes.length >= 2 &&
				(assistantBox?.textContent?.trim().length ?? 0) > 0
			);
		}, undefined);
		if (hasAssistantResponse) return;
		await page.waitForTimeout(SESSION_SETTLE_POLL_MS);
	}

	logger.warn(
		`[doubao] assistant response did not start within ${RESPONSE_START_TIMEOUT_MS}ms`,
	);
}

export async function resetDoubaoPage(
	page: Parameters<ProviderConfig["waitForResponse"]>[0],
): Promise<void> {
	await resetProviderPage(page, "doubao", DOUBAO_URL, {
		postNavigationHook: doubaoPostNavigationHook,
	});
}
