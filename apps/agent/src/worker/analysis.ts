import { toErrorMessage } from "@oneglanse/errors";
import { analysePromptsForWorkspace } from "@oneglanse/services";
import type { Provider } from "@oneglanse/types";
import { createProviderLogger } from "@oneglanse/utils";

let analysisTail = Promise.resolve();

export function runAnalysisInBackground(args: {
	workspaceId: string;
	userId: string;
	provider: Provider;
	jobGroupId: string;
}): void {
	const { workspaceId, provider, jobGroupId } = args;
	const plog = createProviderLogger(provider);
	const run = async () => {
		try {
			plog.log(
				`done for job group ${jobGroupId}, starting analysis in background...`,
			);
			const result = await analysePromptsForWorkspace({
				workspaceId,
				analyzeAll: true,
				runId: jobGroupId,
				modelProvider: provider,
			});
			if (result.failedCount > 0 || result.remainingCount > 0) {
				plog.error(
					`Background analysis incomplete for job group ${jobGroupId}: ${result.analysedCount} analysed, ${result.failedCount} failed, ${result.remainingCount} remaining`,
				);
				return;
			}
			plog.success(
				`Background analysis completed for job group ${jobGroupId}: ${result.analysedCount} analysed`,
			);
		} catch (err) {
			plog.error(
				`Background analysis failed for job group ${jobGroupId}:`,
				toErrorMessage(err),
			);
		}
	};

	// Provider jobs now run concurrently. Serialize their LLM analysis calls so
	// one six-provider batch does not create a burst that trips API rate limits.
	analysisTail = analysisTail.then(run, run);
}
