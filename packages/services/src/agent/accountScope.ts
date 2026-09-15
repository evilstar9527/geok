import { AsyncLocalStorage } from "node:async_hooks";
import { PROVIDER_ACCOUNT_IDS, type ProviderAccountId } from "@oneglanse/types";

const accountScope = new AsyncLocalStorage<ProviderAccountId>();

export function parseProviderAccountId(
	value: unknown = "default",
): ProviderAccountId {
	if (!PROVIDER_ACCOUNT_IDS.includes(value as ProviderAccountId)) {
		throw new Error("Invalid provider account");
	}
	return value as ProviderAccountId;
}

export function getProviderAccountId(): ProviderAccountId {
	return (
		accountScope.getStore() ??
		parseProviderAccountId(process.env.AGENT_ACCOUNT_ID ?? "default")
	);
}

// Scope async tasks rather than mutating process.env: concurrent accounts must
// never change another task's session paths, identity seed, or auth status.
export function withProviderAccount<T>(
	accountId: ProviderAccountId,
	task: () => T,
): T {
	return accountScope.run(parseProviderAccountId(accountId), task);
}
