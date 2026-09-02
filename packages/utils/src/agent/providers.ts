import type { AuthProvider, Provider } from "@oneglanse/types";
import { AUTH_PROVIDER_LIST, PROVIDER_LIST } from "@oneglanse/types";

interface ProviderDisplayConfig {
	displayName: string;
	domain: string;
	description: string;
}

export const PROVIDER_DISPLAY = {
	chatgpt: {
		displayName: "ChatGPT",
		domain: "openai.com",
		description: "ChatGPT - Powered by GPT-4",
	},
	perplexity: {
		displayName: "Perplexity",
		domain: "perplexity.ai",
		description: "Real-time web search and citations",
	},
	gemini: {
		displayName: "Gemini",
		domain: "gemini.google.com",
		description: "Gemini - Latest AI model",
	},
	claude: {
		displayName: "Claude",
		domain: "claude.ai",
		description: "Claude - Advanced reasoning and analysis",
	},
	"ai-overview": {
		displayName: "AI Overview",
		domain: "google.com",
		description: "Google Search AI summaries",
	},
	doubao: {
		displayName: "豆包",
		domain: "doubao.com",
		description: "字节跳动豆包 —— 国内月活最高的 AI 助手",
	},
	deepseek: {
		displayName: "DeepSeek",
		domain: "deepseek.com",
		description: "DeepSeek 网页版对话",
	},
	kimi: {
		displayName: "Kimi",
		domain: "kimi.com",
		description: "月之暗面 Kimi —— 国产大模型",
	},
	yuanbao: {
		displayName: "元宝",
		domain: "yuanbao.tencent.com",
		description: "腾讯元宝 —— 腾讯 AI 助手",
	},
	qianwen: {
		displayName: "千问",
		domain: "qianwen.com",
		description: "阿里千问 —— 阿里巴巴 AI 助手",
	},
	diandian: {
		displayName: "点点",
		domain: "xiaohongshu.com",
		description: "小红书点点 —— 主打生活场景的 AI 搜索助手",
	},
} satisfies Record<Provider, ProviderDisplayConfig>;

interface AuthProviderDisplayConfig {
	displayName: string;
	domain: string;
	connectLabel: string;
}

interface AuthProviderConfig extends AuthProviderDisplayConfig {
	loginUrl: string;
	postLoginUrls: string[];
	domainSuffixes: string[];
	providers: Provider[];
}

export const AUTH_PROVIDER_DISPLAY = {
	chatgpt: {
		displayName: "ChatGPT",
		domain: "openai.com",
		connectLabel: "Connect with ChatGPT",
	},
	perplexity: {
		displayName: "Perplexity",
		domain: "perplexity.ai",
		connectLabel: "Connect with Perplexity",
	},
	gemini: {
		displayName: "Gemini",
		domain: "gemini.google.com",
		connectLabel: "Connect with Gemini",
	},
	google: {
		displayName: "Google",
		domain: "google.com",
		connectLabel: "Connect with Google",
	},
	claude: {
		displayName: "Claude",
		domain: "claude.ai",
		connectLabel: "Connect with Claude",
	},
	doubao: {
		displayName: "豆包",
		domain: "doubao.com",
		connectLabel: "连接豆包账号",
	},
	deepseek: {
		displayName: "DeepSeek",
		domain: "deepseek.com",
		connectLabel: "连接 DeepSeek 账号",
	},
	kimi: {
		displayName: "Kimi",
		domain: "kimi.com",
		connectLabel: "连接 Kimi 账号",
	},
	yuanbao: {
		displayName: "元宝",
		domain: "yuanbao.tencent.com",
		connectLabel: "连接元宝账号",
	},
	qianwen: {
		displayName: "千问",
		domain: "qianwen.com",
		connectLabel: "连接千问账号",
	},
	diandian: {
		displayName: "点点",
		domain: "xiaohongshu.com",
		connectLabel: "连接点点账号",
	},
} satisfies Record<AuthProvider, AuthProviderDisplayConfig>;

export const AUTH_PROVIDER_CONFIG = {
	chatgpt: {
		displayName: "ChatGPT",
		domain: "openai.com",
		connectLabel: "Connect with ChatGPT",
		loginUrl: "https://chatgpt.com/auth/login",
		postLoginUrls: ["https://chatgpt.com/"],
		domainSuffixes: ["chatgpt.com", "openai.com"],
		providers: ["chatgpt"],
	},
	perplexity: {
		displayName: "Perplexity",
		domain: "perplexity.ai",
		connectLabel: "Connect with Perplexity",
		loginUrl: "https://www.perplexity.ai/",
		postLoginUrls: ["https://www.perplexity.ai/"],
		domainSuffixes: ["perplexity.ai"],
		providers: ["perplexity"],
	},
	gemini: {
		displayName: "Gemini",
		domain: "gemini.google.com",
		connectLabel: "Connect with Gemini",
		loginUrl: "https://gemini.google.com/",
		postLoginUrls: ["https://gemini.google.com/"],
		domainSuffixes: [
			"gemini.google.com",
			"google.com",
			"googleusercontent.com",
			"gstatic.com",
		],
		providers: ["gemini"],
	},
	google: {
		displayName: "Google",
		domain: "google.com",
		connectLabel: "Connect with Google",
		loginUrl: "https://www.google.com/",
		postLoginUrls: ["https://www.google.com/"],
		domainSuffixes: ["google.com", "googleusercontent.com", "gstatic.com"],
		providers: ["ai-overview"],
	},
	claude: {
		displayName: "Claude",
		domain: "claude.ai",
		connectLabel: "Connect with Claude",
		loginUrl: "https://claude.ai/login",
		postLoginUrls: ["https://claude.ai/new"],
		domainSuffixes: ["claude.ai", "anthropic.com"],
		providers: ["claude"],
	},
	// 豆包/DeepSeek 都是手机号 + 短信验证码登录,没有 OAuth 流程,
	// 所以只能走 local mode 的交互式登录(isInteractiveAuthAllowedInMode),
	// 由使用者本人在弹出的浏览器里完成验证码输入,随后复用 storageState。
	doubao: {
		displayName: "豆包",
		domain: "doubao.com",
		connectLabel: "连接豆包账号",
		loginUrl: "https://www.doubao.com/chat/",
		postLoginUrls: ["https://www.doubao.com/chat/"],
		domainSuffixes: ["doubao.com", "bytedance.com", "byteimg.com"],
		providers: ["doubao"],
	},
	deepseek: {
		displayName: "DeepSeek",
		domain: "deepseek.com",
		connectLabel: "连接 DeepSeek 账号",
		loginUrl: "https://chat.deepseek.com/sign_in",
		postLoginUrls: ["https://chat.deepseek.com/"],
		domainSuffixes: ["deepseek.com"],
		providers: ["deepseek"],
	},
	kimi: {
		displayName: "Kimi",
		domain: "kimi.com",
		connectLabel: "连接 Kimi 账号",
		loginUrl: "https://www.kimi.com/",
		postLoginUrls: ["https://www.kimi.com/"],
		// kimi.moonshot.cn now redirects to www.kimi.com. Keep the legacy
		// domains so older saved sessions can still be imported.
		domainSuffixes: ["kimi.com", "kimi.moonshot.cn", "moonshot.cn"],
		providers: ["kimi"],
	},
	yuanbao: {
		displayName: "元宝",
		domain: "yuanbao.tencent.com",
		connectLabel: "连接元宝账号",
		loginUrl: "https://yuanbao.tencent.com/chat/",
		postLoginUrls: ["https://yuanbao.tencent.com/chat/"],
		domainSuffixes: ["yuanbao.tencent.com", "tencent.com"],
		providers: ["yuanbao"],
	},
	qianwen: {
		displayName: "千问",
		domain: "qianwen.com",
		connectLabel: "连接千问账号",
		loginUrl: "https://www.qianwen.com/",
		postLoginUrls: ["https://www.qianwen.com/"],
		// 仅保存千问及其明确的登录域名，避免把整个阿里云账号会话上传到 VPS。
		domainSuffixes: [
			"qianwen.com",
			"tongyi.aliyun.com",
			"passport.aliyun.com",
			"login.aliyun.com",
			"signin.aliyun.com",
		],
		providers: ["qianwen"],
	},
	// 点点(小红书 AI 搜索助手网页版)同样没有 OAuth 流程,走手机号/扫码
	// 登录,因此也只能走 local mode 的交互式登录,由使用者本人完成。
	diandian: {
		displayName: "点点",
		domain: "xiaohongshu.com",
		connectLabel: "连接点点账号",
		loginUrl: "https://www.xiaohongshu.com/ai_chat",
		postLoginUrls: ["https://www.xiaohongshu.com/ai_chat"],
		domainSuffixes: ["xiaohongshu.com", "xhscdn.com"],
		providers: ["diandian"],
	},
} satisfies Record<AuthProvider, AuthProviderConfig>;

export const PROVIDER_AUTH_GROUP: Record<Provider, AuthProvider> = {
	chatgpt: "chatgpt",
	perplexity: "perplexity",
	gemini: "gemini",
	"ai-overview": "google",
	claude: "claude",
	doubao: "doubao",
	deepseek: "deepseek",
	kimi: "kimi",
	yuanbao: "yuanbao",
	qianwen: "qianwen",
	diandian: "diandian",
};

export const ALL_PROVIDERS_JSON = JSON.stringify([...PROVIDER_LIST]);
export const ALL_AUTH_PROVIDERS_JSON = JSON.stringify([...AUTH_PROVIDER_LIST]);

/**
 * Get the user-friendly display name for a provider
 * @param provider - The provider key (chatgpt, perplexity, gemini)
 * @returns Display name (ChatGPT, Claude, Perplexity, Gemini)
 */
export function getProviderDisplayName(provider: string): string {
	const config = PROVIDER_DISPLAY[provider as keyof typeof PROVIDER_DISPLAY];
	return config?.displayName ?? provider;
}

export function getAuthProviderDisplayName(provider: string): string {
	const config =
		AUTH_PROVIDER_DISPLAY[provider as keyof typeof AUTH_PROVIDER_DISPLAY];
	return config?.displayName ?? provider;
}

export function getAuthProviderForProvider(provider: Provider): AuthProvider {
	return PROVIDER_AUTH_GROUP[provider];
}
