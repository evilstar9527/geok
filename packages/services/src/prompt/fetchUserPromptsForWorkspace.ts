import { clickhouse } from "@oneglanse/db";
import type {
	FetchUserPromptsForWorkspaceArgs,
	UserPrompt,
} from "@oneglanse/types";

export async function fetchUserPromptsForWorkspace(
	args: FetchUserPromptsForWorkspaceArgs,
): Promise<UserPrompt[]> {
	const { workspaceId } = args;

	const result = await clickhouse.query({
		query: `
        SELECT *
        FROM analytics.user_prompts
        WHERE workspace_id = {workspaceId:String}
        ORDER BY sort_order ASC, created_at ASC, prompt ASC
      `,
		query_params: { workspaceId },
		format: "JSONEachRow",
	});

	const data: UserPrompt[] = (await result.json()) as UserPrompt[];
	return data;
}
