import type { ReportTemplateSnapshot } from "@oneglanse/types";

export interface TemplateResponseRow {
	id: string;
	prompt: string;
	model_provider: string;
	run_utc: string;
	response: string;
	sources: { url: string }[];
	brand_analysis: string;
}

interface StoredAnalysis {
	presence?: { mentioned?: boolean };
	competitors?: { name: string }[];
	perception?: { coreClaims?: string[] };
}

function parseAnalysis(value: string): StoredAnalysis | null {
	try {
		const parsed = JSON.parse(value) as StoredAnalysis | null;
		return typeof parsed?.presence?.mentioned === "boolean" ? parsed : null;
	} catch {
		return null;
	}
}

function sourceDomain(value: string): string | null {
	try {
		const url = new URL(value);
		return ["https:", "http:"].includes(url.protocol)
			? url.hostname.replace(/^www\./, "")
			: null;
	} catch {
		return null;
	}
}

export function buildTemplateSnapshot(
	rows: TemplateResponseRow[],
	brand: { name: string; domain: string | null },
	generatedAt = new Date().toISOString(),
): ReportTemplateSnapshot {
	const ordered = [...rows].sort(
		(a, b) => a.run_utc.localeCompare(b.run_utc) || a.id.localeCompare(b.id),
	);
	const providers = new Map<
		string,
		ReportTemplateSnapshot["providers"][number]
	>();
	const questions = new Map<
		string,
		ReportTemplateSnapshot["questions"][number]
	>();
	const competitors = new Map<string, { name: string; count: number }>();
	const domains = new Map<string, number>();
	const urls = new Set<string>();
	const records: ReportTemplateSnapshot["records"] = [];
	const evidence: ReportTemplateSnapshot["evidence"] = [];
	let analysed = 0;
	let mentioned = 0;
	let sourceCount = 0;
	const registeredDomain = sourceDomain(
		brand.domain?.includes("://")
			? brand.domain
			: `https://${brand.domain ?? ""}`,
	);

	for (const [index, row] of ordered.entries()) {
		const analysis = parseAnalysis(row.brand_analysis);
		const isMentioned = analysis?.presence?.mentioned === true;
		const ref = `R${String(index + 1).padStart(2, "0")}`;
		const time = `${row.run_utc.replace(" ", "T")}Z`;
		const provider = providers.get(row.model_provider) ?? {
			name: row.model_provider,
			collected: 0,
			analysed: 0,
			mentioned: 0,
			pending: 0,
		};
		const question = questions.get(row.prompt) ?? {
			prompt: row.prompt,
			collected: 0,
			analysed: 0,
			mentioned: 0,
		};
		provider.collected++;
		question.collected++;
		if (analysis) {
			analysed++;
			provider.analysed++;
			question.analysed++;
			if (isMentioned) {
				mentioned++;
				provider.mentioned++;
				question.mentioned++;
				// A stored brand claim can locate a verbatim excerpt when the answer
				// uses an alias instead of the workspace's full brand name.
				const needles = [
					brand.name,
					...(analysis.perception?.coreClaims ?? []),
				].filter((value) => typeof value === "string" && value.length >= 2);
				const offset =
					needles
						.map((value) =>
							row.response.toLowerCase().indexOf(value.toLowerCase()),
						)
						.find((value) => value >= 0) ?? -1;
				if (offset >= 0 && evidence.length < 3) {
					const start = row.response.lastIndexOf("\n", offset) + 1;
					const lineEnd = row.response.indexOf("\n", offset);
					const text = row.response
						.slice(
							start,
							Math.min(
								lineEnd < 0 ? row.response.length : lineEnd,
								start + 360,
							),
						)
						.trim();
					evidence.push({
						ref,
						model: row.model_provider,
						prompt: row.prompt,
						time,
						text,
					});
				}
			}
			const seen = new Set<string>();
			for (const competitor of analysis.competitors ?? []) {
				if (typeof competitor.name !== "string" || !competitor.name.trim())
					continue;
				const name = competitor.name.trim();
				const key = name.replace(/\s+/g, "").toLowerCase();
				if (
					seen.has(key) ||
					key === brand.name.replace(/\s+/g, "").toLowerCase()
				)
					continue;
				seen.add(key);
				const item = competitors.get(key) ?? { name, count: 0 };
				item.count++;
				competitors.set(key, item);
			}
		} else provider.pending++;
		providers.set(row.model_provider, provider);
		questions.set(row.prompt, question);
		for (const source of row.sources ?? []) {
			const domain = sourceDomain(source.url);
			if (!domain) continue;
			sourceCount++;
			urls.add(source.url);
			domains.set(domain, (domains.get(domain) ?? 0) + 1);
		}
		records.push({
			ref,
			model: row.model_provider,
			prompt: row.prompt,
			time,
			status: analysis
				? isMentioned
					? "mentioned"
					: "not_mentioned"
				: "pending",
			sources: row.sources?.length ?? 0,
		});
	}
	return {
		generatedAt,
		rangeStart: records[0]?.time ?? null,
		rangeEnd: records.at(-1)?.time ?? null,
		collected: records.length,
		analysed,
		mentioned,
		pending: records.length - analysed,
		providers: [...providers.values()].sort(
			(a, b) => b.mentioned - a.mentioned || a.name.localeCompare(b.name),
		),
		questions: [...questions.values()],
		competitors: [...competitors.values()]
			.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
			.slice(0, 6),
		sourceCount,
		uniqueSourceUrls: urls.size,
		sourceDomains: domains.size,
		registeredDomainSources: registeredDomain
			? [...domains.entries()].reduce(
					(sum, [domain, count]) =>
						sum +
						(domain === registeredDomain ||
						domain.endsWith(`.${registeredDomain}`)
							? count
							: 0),
					0,
				)
			: 0,
		sources: [...domains.entries()]
			.map(([domain, count]) => ({ domain, count }))
			.sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
			.slice(0, 8),
		evidence,
		records,
	};
}
