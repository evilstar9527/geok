import { toErrorMessage } from "@oneglanse/errors";
import { enqueueAnalysisRun } from "@oneglanse/services";
import type { ExecutionSurface, Provider } from "@oneglanse/types";
import { createProviderLogger } from "@oneglanse/utils";

/**
 * Hands a stored batch of responses to the analysis worker.
 *
 * The responses are already in ClickHouse by the time this runs, so a failure
 * to enqueue must not fail the provider run — it is logged and the next batch
 * (or the run's final batch) covers the same scope, because the analysis job
 * selects every not-yet-analysed row for the run rather than named rows.
 */
export async function queueAnalysis(args: {
	workspaceId: string;
	userId: string;
	provider: Provider;
	surface: ExecutionSurface;
	jobGroupId: string;
	batch: number;
}): Promise<void> {
	const plog = createProviderLogger(args.provider);
	try {
		await enqueueAnalysisRun({
			jobGroupId: args.jobGroupId,
			workspaceId: args.workspaceId,
			userId: args.userId,
			provider: args.provider,
			surface: args.surface,
			batch: args.batch,
		});
		plog.log(
			`queued analysis batch ${args.batch} for job group ${args.jobGroupId}`,
		);
	} catch (err) {
		plog.error(
			`failed to queue analysis batch ${args.batch} for job group ${args.jobGroupId}:`,
			toErrorMessage(err),
		);
	}
}
