"use client";
import type { ProviderAccountId } from "@oneglanse/types";

import {
	type UseMutationOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type {
	ProviderConnectionRequest,
	ProviderConnectionsState,
} from "./types";

const PROVIDER_CONNECTIONS_QUERY_KEY = ["provider-connections"] as const;
const PROVIDER_CONNECTIONS_POLL_INTERVAL_MS = 3_000;

async function readJson<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const message =
			((await response.json().catch(() => null)) as { error?: string } | null)
				?.error ?? `Request failed with status ${response.status}`;
		throw new Error(message);
	}

	return (await response.json()) as T;
}

async function fetchProviderConnections(
	accountId: ProviderAccountId,
): Promise<ProviderConnectionsState> {
	const response = await fetch(`/api/providers?accountId=${accountId}`, {
		cache: "no-store",
	});
	return readJson<ProviderConnectionsState>(response);
}

async function startProviderConnection({
	provider,
	accountId = "default",
	action = "connect",
}: ProviderConnectionRequest): Promise<{
	started: boolean;
}> {
	const response = await fetch("/api/providers", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ provider, action, accountId }),
	});
	return readJson<{ started: boolean }>(response);
}

async function resetAllProviders(
	accountId: ProviderAccountId,
): Promise<{ ok: boolean }> {
	const response = await fetch(`/api/providers?accountId=${accountId}`, {
		method: "DELETE",
	});
	return readJson<{ ok: boolean }>(response);
}

export function useProviderConnections(options?: {
	initialData?: ProviderConnectionsState;
	accountId?: ProviderAccountId;
	watchForExternalUpdates?: boolean;
}) {
	return useQuery({
		queryKey: [
			...PROVIDER_CONNECTIONS_QUERY_KEY,
			options?.accountId ?? "default",
		],
		queryFn: () => fetchProviderConnections(options?.accountId ?? "default"),
		initialData: options?.initialData,
		// Always considered stale so window focus triggers a refetch immediately.
		staleTime: 0,
		// Only poll while a connection is in progress; otherwise window focus is enough.
		refetchInterval: (query) => {
			const data = query.state.data;
			if (!data) return PROVIDER_CONNECTIONS_POLL_INTERVAL_MS;
			const anyConnecting = data.cards.some((card) => card.status.connecting);
			const shouldWatchForExternalUpdates =
				options?.watchForExternalUpdates === true;
			return anyConnecting || shouldWatchForExternalUpdates
				? PROVIDER_CONNECTIONS_POLL_INTERVAL_MS
				: false;
		},
	});
}

export function useProviderConnectionAction(
	options?: Omit<
		UseMutationOptions<{ started: boolean }, Error, ProviderConnectionRequest>,
		"mutationFn"
	>,
) {
	const queryClient = useQueryClient();
	const { onSettled, ...restOptions } = options ?? {};

	return useMutation({
		mutationFn: startProviderConnection,
		onSettled: async (...args) => {
			await queryClient.invalidateQueries({
				queryKey: PROVIDER_CONNECTIONS_QUERY_KEY,
			});
			await onSettled?.(...args);
		},
		...restOptions,
	});
}

export function useResetAllProviders(
	options?: Omit<
		UseMutationOptions<{ ok: boolean }, Error, void>,
		"mutationFn"
	>,
	accountId: ProviderAccountId = "default",
) {
	const queryClient = useQueryClient();
	const { onSettled, ...restOptions } = options ?? {};

	return useMutation({
		mutationFn: () => resetAllProviders(accountId),
		onSettled: async (...args) => {
			await queryClient.invalidateQueries({
				queryKey: PROVIDER_CONNECTIONS_QUERY_KEY,
			});
			await onSettled?.(...args);
		},
		...restOptions,
	});
}
