import type { Provider } from "@oneglanse/types";

// Floor that rejects pure garbage fragments (wrong element, partial capture)
// while passing genuine short factual answers. 200 was too blunt — it was
// rejecting correct extractions of concise answers under ~200 chars.
export const DEFAULT_MIN_RESPONSE_CHARS = 40;

// Per-provider overrides. AI Overview returns short factual snippets by design;
// applying the same 600-char floor as chat providers causes excessive retries.
//
// 豆包/DeepSeek 用更低的下限:40 这个阈值是按英文标定的,而中文信息密度高得多 ——
// 「上海做热玛吉推荐美莱、艺星、时光整形三家,均具备正规医疗资质」只有 30 字,
// 却是一条完整且点名的有效回答。沿用 40 会把这类回答判为过短丢弃,
// 直接压低点名率统计,而点名率正是这套实测要测的核心指标。
export const PROVIDER_MIN_RESPONSE_CHARS: Partial<Record<Provider, number>> = {
	"ai-overview": 50,
	doubao: 18,
	deepseek: 18,
	kimi: 18,
	yuanbao: 18,
	qianwen: 18,
};

/**
 * Known false/garbage response patterns across all providers.
 * Ordered from most specific to most general.
 */
const FALSE_RESPONSE_PATTERNS: RegExp[] = [
	// Gemini terms / disclaimer footer
	/google terms.*opens in a new window.*apply/i,
	/gemini is ai and can make mistakes/i,
	/google privacy policy.*apply/i,
	// CAPTCHA / bot detection
	/our systems have detected unusual traffic/i,
	/please verify you('re| are) human/i,
	// Rate limiting
	/too many requests/i,
	// Downtime / unavailable
	/service is (currently )?unavailable/i,
	// Auth walls / session expiry
	/sign in to (continue|use|access)/i,
	/you('ve| have) been logged out/i,
	/access denied/i,
	// ── 中文平台(豆包/DeepSeek)的等价文案 ──
	// 上面的英文 pattern 一条都匹配不到中文 UI,漏掉会把「登录墙」「限流」
	// 当成有效回答存进库里,直接污染点名率统计。
	/请先登录|登录后即可|扫码登录|请登录后使用/,
	/操作过于频繁|请求过于频繁|访问过于频繁|稍后再试/,
	/服务器繁忙|系统繁忙|服务暂时不可用|网络连接异常/,
	/请完成安全验证|请输入验证码|人机验证/,
];

type ValidationResult = { valid: true } | { valid: false; reason: string };

export function validateResponse(
	response: string,
	provider: Provider,
): ValidationResult {
	const trimmed = response.trim();
	const minChars =
		PROVIDER_MIN_RESPONSE_CHARS[provider] ?? DEFAULT_MIN_RESPONSE_CHARS;

	if (trimmed.length < minChars) {
		return {
			valid: false,
			reason: `Response too short (${trimmed.length} chars, min ${minChars})`,
		};
	}

	for (const pattern of FALSE_RESPONSE_PATTERNS) {
		if (pattern.test(trimmed)) {
			return {
				valid: false,
				reason: `False/garbage response detected — matched: "${pattern}"`,
			};
		}
	}

	return { valid: true };
}
