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

/** Counts are summed across independent answers, never treated as unique citations. */
export function summarizeReferenceEvidence(responses: PromptResponse[]) {
	const groups = new Map<
		string,
		{
			provider: string;
			responses: number;
			recordedResponses: number;
			reportedTotal: number;
			min: number | null;
			max: number | null;
			responsesWithoutLinks: number;
			badges: string[];
		}
	>();
	for (const response of responses) {
		const provider = response.model_provider;
		if (provider !== "doubao" && provider !== "diandian") continue;
		const group = groups.get(provider) ?? {
			provider,
			responses: 0,
			recordedResponses: 0,
			reportedTotal: 0,
			min: null,
			max: null,
			responsesWithoutLinks: 0,
			badges: [],
		};
		groups.set(provider, group);
		group.responses++;
		let metadata = response.collection_metadata;
		if (typeof metadata === "string") {
			try {
				metadata = JSON.parse(metadata);
			} catch {
				metadata = undefined;
			}
		}
		const evidence =
			typeof metadata === "object" ? metadata?.referenceEvidence : undefined;
		if (
			!evidence ||
			evidence.method !== "snapshot-reference-badge-v1" ||
			!Number.isSafeInteger(evidence.count) ||
			evidence.count < 0 ||
			typeof evidence.badge !== "string"
		)
			continue;
		const match = evidence.badge.match(
			provider === "doubao"
				? /^搜索 \d+ 个关键词，参考 (\d+) 篇资料$/
				: /^参考小红书与全网内容(\d+)篇$/,
		);
		if (!match || Number(match[1]) !== evidence.count) continue;
		group.recordedResponses++;
		group.reportedTotal += evidence.count;
		group.min = Math.min(group.min ?? evidence.count, evidence.count);
		group.max = Math.max(group.max ?? evidence.count, evidence.count);
		if (!response.sources?.length) group.responsesWithoutLinks++;
		if (group.badges.length < 3 && !group.badges.includes(evidence.badge))
			group.badges.push(evidence.badge);
	}
	return [...groups.values()].sort((a, b) =>
		a.provider.localeCompare(b.provider),
	);
}
