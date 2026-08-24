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
} satisfies Record<AuthProvider, AuthProviderConfig>;

export const PROVIDER_AUTH_GROUP: Record<Provider, AuthProvider> = {
	chatgpt: "chatgpt",
	perplexity: "perplexity",
	gemini: "gemini",
	"ai-overview": "google",
	claude: "claude",
	doubao: "doubao",
	deepseek: "deepseek",
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
