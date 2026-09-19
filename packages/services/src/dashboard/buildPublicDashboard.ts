import {
	type TemplateResponseRow,
	buildTemplateSnapshot,
} from "../report/buildTemplateSnapshot.js";

export interface DashboardResponseRow
	extends Omit<TemplateResponseRow, "brand_analysis"> {
	prompt_id: string;
}

export interface DashboardAnalysisRow {
	id: string;
	response_id: string;
	prompt_id: string;
	model_provider: string;
	run_utc: string;
	created_utc: string;
	brand_analysis: string;
}

const legacyKey = (row: {
	prompt_id: string;
	model_provider: string;
	run_utc: string;
}) => JSON.stringify([row.prompt_id, row.model_provider, row.run_utc]);

interface CurrentAnalysis {
	presence: { mentioned: boolean };
	sentiment?: { score?: number };
	position?: { rankPosition?: number | null };
	competitors?: { name: string }[];
}

function currentBrandAnalysis(
	value: string,
	brand: { name: string; domain: string | null },
): CurrentAnalysis | null {
	try {
		const analysis = JSON.parse(value);
		const metadata = analysis?.metadata;
		if (
			typeof analysis?.presence?.mentioned !== "boolean" ||
			(metadata?.brandName && metadata.brandName !== brand.name) ||
			(metadata?.brandDomain && metadata.brandDomain !== brand.domain)
		)
			return null;
		return analysis;
	} catch {
		return null;
	}
}

export function buildPublicDashboard(
	responses: DashboardResponseRow[],
	analyses: DashboardAnalysisRow[],
	brand: { name: string; domain: string | null },
	generatedAt = new Date().toISOString(),
) {
	const byResponse = new Map<string, DashboardAnalysisRow>();
	const legacy = new Map<string, DashboardAnalysisRow>();
	const responseCounts = new Map<string, number>();
	for (const response of responses) {
		const key = legacyKey(response);
		responseCounts.set(key, (responseCounts.get(key) ?? 0) + 1);
	}
	for (const analysis of analyses) {
		const target = analysis.response_id ? byResponse : legacy;
		const key = analysis.response_id || legacyKey(analysis);
		const previous = target.get(key);
		if (
			!previous ||
			analysis.created_utc > previous.created_utc ||
			(analysis.created_utc === previous.created_utc &&
				analysis.id > previous.id)
		)
			target.set(key, analysis);
	}
	const rows = responses
		.map((response) => {
			const key = legacyKey(response);
			// A legacy analysis cannot identify one of several repeated samples.
			// An invalid/new-brand exact analysis must not fall back to an older one.
			const analysis =
				byResponse.get(response.id) ??
				(responseCounts.get(key) === 1 ? legacy.get(key) : undefined);
			return {
				...response,
				brand_analysis:
					analysis && currentBrandAnalysis(analysis.brand_analysis, brand)
						? analysis.brand_analysis
						: "",
			};
		})
		.sort(
			(a, b) => a.run_utc.localeCompare(b.run_utc) || a.id.localeCompare(b.id),
		);
	const snapshot = buildTemplateSnapshot(rows, brand, generatedAt);
	const templateSnapshot = {
		...snapshot,
		records: snapshot.records.map((record, index) => {
			const row = rows[index] as TemplateResponseRow;
			const analysis = currentBrandAnalysis(row.brand_analysis, brand);
			const score = analysis?.sentiment?.score;
			const rank = analysis?.position?.rankPosition;
			const names = new Map<string, string>();
			for (const competitor of analysis?.competitors ?? []) {
				const name = competitor.name?.trim();
				const key = name?.replace(/\s+/g, "").toLowerCase();
				if (name && key && key !== brand.name.replace(/\s+/g, "").toLowerCase())
					names.set(key, name);
			}
			return {
				...record,
				sentimentScore:
					typeof score === "number" &&
					Number.isFinite(score) &&
					score >= 0 &&
					score <= 100
						? score
						: null,
				rankPosition:
					typeof rank === "number" && Number.isInteger(rank) && rank > 0
						? rank
						: null,
				excerpt: analysis?.presence.mentioned
					? row.response.slice(0, 360).trim() || null
					: null,
				sourceUrls: row.sources.flatMap((source) => {
					try {
						return ["http:", "https:"].includes(new URL(source.url).protocol)
							? [source.url]
							: [];
					} catch {
						return [];
					}
				}),
				competitorNames: [...names.values()],
			};
		}),
	};
	const mentions = [
		{
			name: brand.name,
			domain: brand.domain,
			count: templateSnapshot.mentioned,
			isBrand: true,
		},
		...templateSnapshot.competitors.map((item) => ({
			...item,
			domain: null,
			isBrand: false,
		})),
	];
	return {
		id: "live" as const,
		source: "database" as const,
		createdAt: generatedAt,
		data: {
			version: 3 as const,
			brand,
			generatedAt,
			totalResponses: templateSnapshot.analysed,
			mentionRates: mentions.map(({ count, ...item }) => ({
				...item,
				appearances: count,
				mentionRate: templateSnapshot.analysed
					? (count / templateSnapshot.analysed) * 100
					: 0,
			})),
			gaps: [],
			templateSnapshot,
		},
	};
}
