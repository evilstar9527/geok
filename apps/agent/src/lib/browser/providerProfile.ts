import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Provider } from "@oneglanse/types";

export type ProviderBrowserProfilePolicy = {
	persistent: boolean;
	stableFingerprint: boolean;
};

const EPHEMERAL_PROFILE_POLICY: ProviderBrowserProfilePolicy = {
	persistent: false,
	stableFingerprint: false,
};

const PROVIDER_PROFILE_POLICIES: Partial<
	Record<Provider, ProviderBrowserProfilePolicy>
> = {
	// 豆包会把每个临时上下文视为新设备并触发安全验证。持久化整个
	// Firefox profile，同时复用首次生成的 Camoufox 启动参数/指纹。
	doubao: {
		persistent: true,
		stableFingerprint: true,
	},
};

export function getProviderBrowserProfilePolicy(
	provider: Provider,
): ProviderBrowserProfilePolicy {
	return PROVIDER_PROFILE_POLICIES[provider] ?? EPHEMERAL_PROFILE_POLICY;
}

function getStableLaunchOptionsFile(userDataDir: string): string {
	return path.join(path.dirname(userDataDir), "launch-options.json");
}

export async function readStableLaunchOptions<T extends object>(
	userDataDir: string,
): Promise<T | null> {
	try {
		const parsed = JSON.parse(
			await readFile(getStableLaunchOptionsFile(userDataDir), "utf8"),
		) as T & { executablePath?: unknown };
		if (
			typeof parsed.executablePath !== "string" ||
			!existsSync(parsed.executablePath)
		) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

export async function writeStableLaunchOptions(
	userDataDir: string,
	options: object,
): Promise<void> {
	const filePath = getStableLaunchOptionsFile(userDataDir);
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, JSON.stringify(options));
}
