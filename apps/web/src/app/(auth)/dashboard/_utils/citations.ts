import type { AnalysisRecord } from "@oneglanse/types";
import { getDomain, removeUrlParams } from "@oneglanse/utils";
import type { SourceData } from "./types";

export interface Citation {
	key: string;
	title: string;
	domain: string;
	url: string;
	count: number;
}

/** Captured links do not depend on brand analysis being complete. */
export function summarizeCitations(records: AnalysisRecord[]) {
	const domains = new Map<
		string,
		SourceData & {
			urls: Set<string>;
			excerpts: { text: string; model: string }[];
		}
	>();
	const articles = new Map<string, Citation>();
	let withSources = 0;
	for (const record of records) {
		// Repeated samples remain independent; duplicates within an answer do not.
		const seen = new Set<string>();
		for (const source of record.sources ?? []) {
			const raw = source.url?.trim();
			if (!raw) continue;
			let url: string;
			try {
				const parsed = new URL(raw);
				if (!["https:", "http:"].includes(parsed.protocol)) continue;
				url = removeUrlParams(parsed.href);
			} catch {
				continue;
			}
			if (seen.has(url)) continue;
			seen.add(url);
			const domain = getDomain(url);
			const entry = domains.get(domain) ?? {
				domain,
				favicon: source.favicon ?? null,
				citationCount: 0,
				uniqueRecords: new Set<string>(),
				models: new Set<string>(),
				excerpts: [],
				urls: new Set<string>(),
			};
			entry.citationCount++;
			entry.uniqueRecords.add(record.id);
			entry.models.add(record.model_provider);
			entry.urls.add(url);
			if (source.cited_text) {
				entry.excerpts.push({
					text: source.cited_text,
					model: record.model_provider,
				});
			}
			domains.set(domain, entry);
			const article = articles.get(url) ?? {
				key: url,
				title: source.title?.trim() || url,
				domain,
				url,
				count: 0,
			};
			article.count++;
			articles.set(url, article);
		}
		if (seen.size) withSources++;
	}
	const sources = [...domains.values()].sort(
		(a, b) =>
			b.citationCount - a.citationCount || a.domain.localeCompare(b.domain),
	);
	return {
		sources,
		articles: [...articles.values()].sort(
			(a, b) => b.count - a.count || a.title.localeCompare(b.title),
		),
		totalCitations: sources.reduce(
			(sum, source) => sum + source.citationCount,
			0,
		),
		responses: records.length,
		withSources,
	};
}

/** Keep the full denominator and area when the long tail is collapsed. */
export function buildCitationDistribution(
	sources: { domain: string; citationCount: number }[],
	otherLabel: string,
) {
	const total = sources.reduce((sum, source) => sum + source.citationCount, 0);
	if (!total) return [];
	const sorted = [...sources].sort((a, b) => b.citationCount - a.citationCount);
	const visible = sorted.slice(0, 12);
	if (sorted.length > 12) {
		visible.push({
			domain: otherLabel,
			citationCount: sorted
				.slice(12)
				.reduce((sum, source) => sum + source.citationCount, 0),
		});
	}
	return visible.map((source) => ({
		name: source.domain,
		value: (source.citationCount / total) * 100,
		count: source.citationCount,
	}));
}
