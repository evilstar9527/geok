import { toErrorMessage } from "@oneglanse/errors";
import { analysePromptsForWorkspace } from "@oneglanse/services";
import type { Provider } from "@oneglanse/types";
import { createProviderLogger } from "@oneglanse/utils";
import { runWithAnalysisGate } from "./analysisGate.js";

export function runAnalysisInBackground(args: {
	workspaceId: string;
	userId: string;
	provider: Provider;
	jobGroupId: string;
}): void {
	const { workspaceId, provider, jobGroupId } = args;
	const plog = createProviderLogger(provider);
	const queuedAt = Date.now();
	const run = async () => {
		const startedAt = Date.now();
		try {
			plog.log(
				`done for job group ${jobGroupId}, starting analysis in background (queued ${startedAt - queuedAt}ms)...`,
			);
			const result = await analysePromptsForWorkspace({
				workspaceId,
				analyzeAll: true,
				runId: jobGroupId,
				modelProvider: provider,
			});
			if (result.failedCount > 0 || result.remainingCount > 0) {
				plog.error(
					`Background analysis incomplete for job group ${jobGroupId}: ${result.analysedCount} analysed, ${result.failedCount} failed, ${result.remainingCount} remaining (${Date.now() - startedAt}ms)`,
				);
				return;
			}
			plog.success(
				`Background analysis completed for job group ${jobGroupId}: ${result.analysedCount} analysed (${Date.now() - startedAt}ms)`,
			);
		} catch (err) {
			plog.error(
				`Background analysis failed for job group ${jobGroupId}:`,
				toErrorMessage(err),
			);
		}
	};

	// Different provider/run scopes can use two slots; overlapping scopes stay
	// serial so their read-then-insert analysis queries cannot select the same rows.
	void runWithAnalysisGate(
		JSON.stringify([workspaceId, jobGroupId, provider]),
		run,
	);
}
