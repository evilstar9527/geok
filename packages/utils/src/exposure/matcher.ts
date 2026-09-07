export interface ExposureEvaluation {
	evaluated: boolean;
	terms: string[];
	matches: string[];
	exposed: boolean;
}

const HAS_CJK = /[\u3400-\u9fff\uf900-\ufaff]/u;
const ASCII_WORD = /[a-z0-9]/i;
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
const HOST_IN_TEXT =
	/(?:https?:\/\/)?(?:www\.)?([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+)/gi;

export function normalizeExposureText(value: string): string {
	return value
		.normalize("NFKC")
		.toLocaleLowerCase("en-US")
		.replace(/\s+/g, " ")
		.trim();
}

export function normalizeExposureTerm(value: string): string {
	const normalized = normalizeExposureText(value);
	if (!normalized) return "";

	try {
		const url = new URL(
			/^[a-z][a-z\d+.-]*:\/\//i.test(normalized)
				? normalized
				: `https://${normalized}`,
		);
		if (
			url.hostname &&
			(normalized.includes(".") || normalized.includes("/"))
		) {
			return url.hostname.replace(/^www\./, "").replace(/\.$/, "");
		}
	} catch {
		// Treat non-URL input as a normal brand/product term.
	}

	return normalized;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesTerm(haystack: string, term: string): boolean {
	if (DOMAIN.test(term)) {
		const hosts = Array.from(haystack.matchAll(HOST_IN_TEXT), (match) =>
			(match[1] ?? "").replace(/^www\./, "").replace(/\.$/, ""),
		);
		return hosts.some((host) => host === term || host.endsWith(`.${term}`));
	}
	if (HAS_CJK.test(term) || !ASCII_WORD.test(term)) {
		return haystack.includes(term);
	}

	const escaped = escapeRegExp(term).replace(/\\ /g, "\\s+");
	return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
}

export function buildExposureTerms(args: {
	brandName?: string | null;
	domain?: string | null;
	aliases?: string[] | null;
}): string[] {
	return [args.brandName ?? "", args.domain ?? "", ...(args.aliases ?? [])]
		.map(normalizeExposureTerm)
		.filter((term, index, terms) => term && terms.indexOf(term) === index);
}

export function evaluateExposure(
	response: string,
	terms: readonly string[],
): ExposureEvaluation {
	const normalizedTerms = terms
		.map(normalizeExposureTerm)
		.filter((term, index, values) => term && values.indexOf(term) === index);
	const normalizedResponse = normalizeExposureText(response);
	const matches = normalizedTerms.filter((term) =>
		matchesTerm(normalizedResponse, term),
	);

	return {
		evaluated: normalizedTerms.length > 0,
		terms: normalizedTerms,
		matches,
		exposed: matches.length > 0,
	};
}

export function aggregateExposureStatistics(
	records: ReadonlyArray<{
		runId?: string;
		exposureEvaluated?: boolean;
		exposureMatches?: readonly string[];
		status?: "success" | "failed";
	}>,
) {
	const eligible = records.filter(
		(record) =>
			record.exposureEvaluated ||
			(record.status === "failed" && Boolean(record.runId)),
	);
	const successful = eligible.filter(
		(record) => record.status !== "failed" && record.exposureEvaluated,
	);
	const exposed = successful.filter(
		(record) => (record.exposureMatches?.length ?? 0) > 0,
	).length;
	const failed = eligible.filter((record) => record.status === "failed").length;
	return {
		planned: eligible.length,
		successful: successful.length,
		failed,
		exposed,
		exposureRate: successful.length ? exposed / successful.length : 0,
		completionRate: eligible.length ? successful.length / eligible.length : 0,
	};
}
