import { submitAgentJobGroup } from "@oneglanse/services";
import type { ExecutionSurface, Provider } from "@oneglanse/types";

type SubmitAgentRunResult =
	| { jobId: string; status: "queued" }
	| { jobId: null; status: "empty" }
	| { jobId: null; status: "no-providers"; disconnectedProviders: string[] };

export async function submitAgentRun(args: {
	accountId?: import("@oneglanse/types").ProviderAccountId;
	workspaceId: string;
	userId: string;
	promptIds?: string[];
	providers?: Provider[];
	surfaces?: ExecutionSurface[];
	runCount?: number;
}): Promise<SubmitAgentRunResult> {
	const result = await submitAgentJobGroup(args);

	if (result.status === "empty") {
		return { jobId: null, status: "empty" };
	}

	if (result.status === "no-providers") {
		return {
			jobId: null,
			status: "no-providers",
			disconnectedProviders: result.disconnectedProviders,
		};
	}

	return { jobId: result.jobGroupId, status: "queued" };
}
