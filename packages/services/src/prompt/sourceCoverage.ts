import type { PromptResponse } from "@oneglanse/types";

/** Missing capture is not evidence that the original answer used no sources. */
export function summarizeSourceCoverage(responses: PromptResponse[]) {
	const counts = {
		withSources: 0,
		snapshotRecovered: 0,
		notCaptured: 0,
		unknown: 0,
	};
	for (const response of responses) {
		let metadata = response.collection_metadata;
		if (typeof metadata === "string") {
			try {
				metadata = JSON.parse(metadata);
			} catch {
				metadata = undefined;
			}
		}
		const coverage =
			typeof metadata === "object" ? metadata?.sourcesCoverage : undefined;
		if (response.sources?.length) {
			counts.withSources++;
			if (coverage === "snapshot_partial") counts.snapshotRecovered++;
		} else if (coverage === "not_exported" || coverage === "snapshot_partial") {
			counts.notCaptured++;
		} else counts.unknown++;
	}
	return counts;
}
