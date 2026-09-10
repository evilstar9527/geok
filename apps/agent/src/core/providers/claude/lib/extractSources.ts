import { toErrorMessage } from "@oneglanse/errors";
import type { Source } from "@oneglanse/types";
import { PROVIDER_MODEL_RESPONSE_SELECTORS, logger } from "@oneglanse/utils";
import type { Page } from "playwright";
import { isPublicHttpUrl } from "../../../../lib/net/urlGuard.js";
import { type RawSource, buildSources } from "../../_shared/sourceUtils.js";

export const CLAUDE_RAW_SOURCES_DOM_EXTRACTOR = String.raw`(
	{
		getCachedRawSources,
		setCachedRawSources,
		findLatestResponseElement,
		extractClaudeRawSourcesFromResponseElement,
	},
	selectors,
) => {
	const cached = getCachedRawSources("claude");
	if (cached) return cached;

	const responseEl = findLatestResponseElement(selectors)?.element;
	if (!responseEl) return [];

	const rawSources = extractClaudeRawSourcesFromResponseElement(responseEl);
	setCachedRawSources("claude", rawSources);
	return rawSources;
}`;

const TITLE_FETCH_TIMEOUT_MS = 5_000;
const TITLE_MAX_BYTES = 256 * 1024;

/**
 * Read at most `maxBytes` of the body. A caller-supplied URL can stream an
 * unbounded response, and `res.text()` would buffer all of it — the title we
 * want is always in the first few kilobytes anyway.
 */
async function readCapped(
	response: Response,
	maxBytes: number,
): Promise<string> {
	const reader = response.body?.getReader();
	if (!reader) return "";

	const decoder = new TextDecoder();
	let text = "";
	let total = 0;

	while (total < maxBytes) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		text += decoder.decode(value, { stream: true });
	}

	await reader.cancel();
	return text;
}

async function fetchTitle(url: string): Promise<string | null> {
	// `url` is an href lifted from model output, so it is attacker-influenced:
	// without this the worker would happily fetch the cloud metadata endpoint or
	// a sibling container on the compose network.
	if (!(await isPublicHttpUrl(url))) return null;

	try {
		const res = await fetch(url, {
			// Following redirects would let a public URL bounce the request to a
			// private address that the guard above never saw. Titles are cosmetic
			// and `source.title` is already a good fallback, so a redirect simply
			// yields no title.
			redirect: "manual",
			signal: AbortSignal.timeout(TITLE_FETCH_TIMEOUT_MS),
		});
		if (!res.ok) return null;

		const html = await readCapped(res, TITLE_MAX_BYTES);
		const match = html.match(/<title>(.*?)<\/title>/i);
		return match?.[1]?.trim() || null;
	} catch {
		return null;
	}
}

export async function extractSourcesFromClaude(page: Page): Promise<Source[]> {
	try {
		const rawSources = await page.runDomOp<RawSource[]>("raw-sources", {
			provider: "claude",
			selectors: PROVIDER_MODEL_RESPONSE_SELECTORS.claude || [],
		});

		const rawSourcesWithFetchedTitles = await Promise.all(
			rawSources.map(async (source) => ({
				...source,
				title: (await fetchTitle(source.rawHref)) || source.title,
			})),
		);

		return buildSources(rawSourcesWithFetchedTitles, { provider: "claude" });
	} catch (error) {
		logger.error(`Failed to extract Claude sources: ${toErrorMessage(error)}`);
		return [];
	}
}
