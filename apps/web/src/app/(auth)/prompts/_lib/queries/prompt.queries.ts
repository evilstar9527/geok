import { api } from "@/trpc/react";
import type { Provider } from "@oneglanse/types";

export function useUserPrompts(workspaceId: string) {
	return api.prompt.fetchUserPrompts.useQuery(
		{ workspaceId },
		{
			enabled: !!workspaceId,
			staleTime: 0,
			gcTime: 10 * 60 * 1000,
			refetchOnWindowFocus: true,
		},
	);
}

export function usePromptSources(
	workspaceId: string,
	filters: {
		startAt?: string;
		endAt?: string;
		modelProvider?: Provider;
		promptId?: string;
	} = {},
) {
	return api.prompt.fetchPromptSources.useQuery(
		{ workspaceId, ...filters },
		{
			retry: 2,
			enabled: !!workspaceId,
			staleTime: 0,
			gcTime: 10 * 60 * 1000,
			refetchOnWindowFocus: true,
		},
	);
}

export function useFetchAnalysedPrompts(workspaceId: string) {
	return api.analysis.fetchAnalysis.useQuery(
		{ workspaceId },
		{
			enabled: !!workspaceId,
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			refetchOnWindowFocus: false,
			// Background analysis starts after the provider job completes and can take
			// several minutes for a batch. Poll quickly while any response is still
			// pending, then fall back to a low-frequency refresh once everything is done.
			refetchInterval: (query) => {
				const records = query.state.data;
				if (!records) return 5000;
				return records.some((record) => !record.is_analysed)
					? 5000
					: 5 * 60 * 1000;
			},
			refetchIntervalInBackground: false,
		},
	);
}
