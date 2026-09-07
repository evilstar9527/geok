import type { Source } from "./sources.js";

export interface AskPromptResult {
	userId: string;
	workspaceId: string;
	promptId: string;
	prompt: string;
	response: string;
	sources: Source[];
	collection?: CollectionMetadata;
}

export const PROVIDER_LIST = [
	"chatgpt",
	"perplexity",
	"gemini",
	"claude",
	"ai-overview",
	"doubao",
	"deepseek",
	"kimi",
	"yuanbao",
	"qianwen",
	"diandian",
] as const;

export type Provider = (typeof PROVIDER_LIST)[number];

export const MOBILE_PROVIDER_LIST = [
	"doubao",
	"deepseek",
	"kimi",
	"yuanbao",
	"qianwen",
	"diandian",
] as const satisfies readonly Provider[];

export type MobileProvider = (typeof MOBILE_PROVIDER_LIST)[number];

export const EXECUTION_SURFACE_LIST = ["web", "android_app"] as const;
export type ExecutionSurface = (typeof EXECUTION_SURFACE_LIST)[number];

export type CacheResetStatus = "applied" | "skipped_unsupported" | "failed";

export interface CollectionMetadata {
	runId: string;
	surface: ExecutionSurface;
	deviceId?: string | null;
	deviceName?: string | null;
	appVersion?: string | null;
	appiumVersion?: string | null;
	cacheResetStatus?: CacheResetStatus | null;
	exposureEvaluated: boolean;
	exposureTerms: string[];
	exposureMatches: string[];
	screenshotArtifactId?: string | null;
	status?: "success" | "failed";
	failureReason?: string | null;
}

export type RunTargetId = `${ExecutionSurface}:${Provider}`;

export function buildRunTargetId(
	surface: ExecutionSurface,
	provider: Provider,
): RunTargetId {
	return `${surface}:${provider}`;
}

export const APP_MODE_LIST = ["self-host", "local"] as const;

export type AppMode = (typeof APP_MODE_LIST)[number];

export function resolveAppMode(rawMode?: string | null): AppMode {
	if (rawMode === "self-host" || rawMode === "local") {
		return rawMode;
	}

	return "self-host";
}

export function canAccessPeopleInMode(appMode: AppMode): boolean {
	return appMode !== "local";
}

export function canConfigureRecurringScheduleInMode(appMode: AppMode): boolean {
	return appMode !== "local";
}

export function shouldUseProxyInMode(appMode: AppMode): boolean {
	return appMode !== "local";
}

export function isInteractiveAuthAllowedInMode(appMode: AppMode): boolean {
	return appMode === "local";
}

export const AUTH_PROVIDER_LIST = [
	"chatgpt",
	"perplexity",
	"gemini",
	"google",
	"claude",
	"doubao",
	"deepseek",
	"kimi",
	"yuanbao",
	"qianwen",
	"diandian",
] as const;

export type AuthProvider = (typeof AUTH_PROVIDER_LIST)[number];

export interface ProviderAuthStatus {
	provider: AuthProvider;
	connected: boolean;
	connecting: boolean;
	synced: boolean;
	lastUpdatedAt: string | null;
	syncedAt: string | null;
	error: string | null;
}

export type AgentResult = {
	status: "fulfilled" | "rejected";
	data: AskPromptResult[];
};

export type ModelResult = Record<Provider, AgentResult>;
