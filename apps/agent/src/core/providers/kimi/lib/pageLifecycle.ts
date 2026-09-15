import { ExternalServiceError } from "@oneglanse/errors";
import { resetProviderPage } from "../../_shared/resetProviderPage.js";
import type { ProviderConfig } from "../../types.js";

export const KIMI_URL = "https://www.kimi.com/";

export function getKimiSubmissionBlocker(text: string): string | null {
	if (
		/currently available to .*members|仅(?:对|限).*会员|升级会员.*(?:使用|体验)/i.test(
			text,
		)
	) {
		return "membership required: selected Kimi mode is unavailable to this account";
	}
	if (
		/usage limit reached|daily limit reached|quota exhausted|今日.*(?:额度|次数).*(?:用完|用尽|上限)/i.test(
			text,
		)
	) {
		return "quota exhausted: Kimi account usage limit reached";
	}
	return null;
}

export async function selectKimiStandardEffort(
	page: Parameters<ProviderConfig["waitForResponse"]>[0],
): Promise<void> {
	const currentEffort = await page.evaluate(
		() => document.querySelector(".effort-current")?.textContent?.trim() ?? "",
		undefined,
	);
	if (!/high/i.test(currentEffort)) return;

	await page.locator(".current-model").click({ timeout: 3_000 });
	await page.locator("button.effort-item").click({ timeout: 3_000 });
	const standard = page
		.locator("button.effort-option")
		.filter({ hasText: "Standard" });
	await standard.click({ timeout: 3_000 });
	await page.waitForTimeout(250);
}

export const checkKimiSubmitSuccess: NonNullable<
	ProviderConfig["checkSubmitSuccess"]
> = async (page, { preSubmitUrl }) => {
	// Clearing the editor alone is not an acknowledgement: failed submissions
	// can clear it while leaving the browser on the home page.
	const deadline = Date.now() + 2_000;
	do {
		await assertKimiSession(page);
		const blocker = getKimiSubmissionBlocker(
			await page.evaluate(() => document.body.innerText, undefined),
		);
		if (blocker) throw new ExternalServiceError("kimi", blocker);
		const currentUrl = await page.getUrl().catch(() => page.url());
		if (
			new URL(currentUrl).pathname.startsWith("/chat/") &&
			currentUrl !== preSubmitUrl
		)
			return true;
		await page.waitForTimeout(150);
	} while (Date.now() < deadline);
	return false;
};

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
