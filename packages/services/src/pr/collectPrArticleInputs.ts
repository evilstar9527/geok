import { clickhouse, db, schema } from "@oneglanse/db";
import { NotFoundError, ValidationError } from "@oneglanse/errors";
import type {
	BrandProfile,
	DomainStats,
	PrArticleSourceRef,
} from "@oneglanse/types";
import {
	classifySourceMedia,
	getDomain,
	getSourceMediaDefinition,
} from "@oneglanse/utils";
import { fetchPromptSourcesForWorkspace } from "../prompt/fetchPromptSourcesForWorkspace.js";
import { fetchUserPromptsForWorkspace } from "../prompt/fetchUserPromptsForWorkspace.js";

/** Ranked citations handed to the model. Past this the tail is noise, not signal. */
const MAX_SOURCES = 15;
/** Quoted excerpts kept per source — enough to show how the source was used. */
const MAX_EXCERPTS = 3;
/** Competitor names kept for title matching; a prompt rarely names more. */
const MAX_COMPETITORS = 20;

/**
 * Everything a PR draft needs that the caller must not supply: brand facts come
 * from the workspace row and citation weights from captured responses. Same
 * reason report snapshots reload brand identity server-side — a client-supplied
 * source list would let an admin draft from invented evidence.
 */
export type PrArticleInputs = {
	brandName: string;
	brandDomain: string | null;
	brandProfile: BrandProfile | null;
	promptText: string;
	/** Ranked by citation count, then domain share; highest weight first. */
	sources: PrArticleSourceRef[];
	competitorNames: string[];
};

export function parseBrandProfile(raw: string | null): BrandProfile | null {
	if (!raw) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		return parsed && typeof parsed === "object"
			? (parsed as BrandProfile)
			: null;
	} catch {
		return null;
	}
}

/**
 * A name and a domain are not enough to write press copy from. Without at least
 * one substantive fact the model can only pad with invention, so this refuses
 * instead of storing a plausible-looking draft nobody can verify.
 */
function hasBrandFacts(profile: BrandProfile | null): boolean {
	if (!profile) return false;
	return Boolean(
		profile.business?.trim() ||
			profile.positioning?.trim() ||
			profile.sellingPoints?.some((point) => point.trim()),
	);
}

/**
 * Competitor names and domains for one prompt, read back out of the analysis
 * rows. Titles of cited articles often name the competitor while the domain is
 * a media outlet, so both signals are needed to mark a source as a peer's PR.
 */
async function fetchCompetitors(args: {
	workspaceId: string;
	promptId: string;
}): Promise<{ names: string[]; domains: Set<string> }> {
	const names = new Set<string>();
	const domains = new Set<string>();

	const result = await clickhouse.query({
		query: `
            SELECT brand_analysis
            FROM analytics.prompt_analysis
            WHERE workspace_id = {workspaceId:String}
              AND prompt_id = {promptId:String}
              AND brand_analysis != ''
            LIMIT 1000
        `,
		query_params: args,
		format: "JSONEachRow",
	});
	const rows = (await result.json()) as Array<{ brand_analysis: string }>;

	for (const row of rows) {
		let analysis: { competitors?: Array<{ name?: string; domain?: string }> };
		try {
			analysis = JSON.parse(row.brand_analysis);
		} catch {
			continue;
		}
		for (const competitor of analysis.competitors ?? []) {
			const name = competitor.name?.trim();
			if (name) names.add(name);
			const domain = competitor.domain ? getDomain(competitor.domain) : "";
			if (domain) domains.add(domain);
		}
	}

	return { names: [...names].slice(0, MAX_COMPETITORS), domains };
}

export async function collectPrArticleInputs(args: {
	workspaceId: string;
	promptId: string;
}): Promise<PrArticleInputs> {
	const { workspaceId, promptId } = args;

	const workspace = await db.query.workspaces.findFirst({
		where: (table, { and, eq, isNull }) =>
			and(eq(table.id, workspaceId), isNull(table.deletedAt)),
	});
	if (!workspace) throw new NotFoundError("品牌不存在");

	const brandProfile = parseBrandProfile(workspace.brandProfile);
	if (!hasBrandFacts(brandProfile)) {
		throw new ValidationError(
			"请先在管理控制台填写该品牌的档案（主营业务、定位或卖点），否则生成的 PR 稿无法保证内容真实。",
		);
	}

	const prompts = await fetchUserPromptsForWorkspace({ workspaceId });
	const prompt = prompts.find((item) => item.id === promptId);
	if (!prompt) throw new NotFoundError("提示词不存在");

	const { domain_stats, sourceStats, responseCount } =
		await fetchPromptSourcesForWorkspace({ workspaceId, promptId });
	if (responseCount === 0 || sourceStats.combined.length === 0) {
		throw new ValidationError("该提示词还没有可用于生成 PR 稿的信源数据。");
	}

	const domainWeights = new Map<string, DomainStats>(
		domain_stats.combined.map((stat) => [stat.domain, stat]),
	);
	const competitors = await fetchCompetitors({ workspaceId, promptId });

	const shareOf = (url: string) =>
		domainWeights.get(getDomain(url) ?? "")?.usedPercentageAcrossAllDomains ??
		0;

	// Citation count alone leaves most prompts fully tied (every URL cited once
	// per response), and a tied sort keeps whatever order the query returned —
	// which would not be the "highest weight first" order the prompt promises.
	// Domain share breaks those ties on the same weight the sources page shows.
	const ranked = [...sourceStats.combined].sort(
		(a, b) =>
			b.totalSources - a.totalSources || shareOf(b.url) - shareOf(a.url),
	);

	const sources: PrArticleSourceRef[] = ranked
		.slice(0, MAX_SOURCES)
		.map((group) => {
			const domain = getDomain(group.url) ?? "";
			const mediaType = classifySourceMedia(group.url, workspace.domain);
			return {
				title: group.title,
				url: group.url,
				domain,
				mediaType: getSourceMediaDefinition(mediaType).label,
				citationCount: group.totalSources,
				domainSharePercent: shareOf(group.url),
				excerpts: group.excerpts
					.map((excerpt) => excerpt.cited_text.trim())
					.filter((text) => text.length > 0)
					.slice(0, MAX_EXCERPTS),
				// Our own domain is classified "official" and is never a peer.
				isCompetitor:
					mediaType !== "official" &&
					(competitors.domains.has(domain) ||
						competitors.names.some((name) => group.title.includes(name))),
			};
		});

	return {
		brandName: workspace.name,
		brandDomain: getDomain(workspace.domain) || null,
		brandProfile,
		promptText: prompt.prompt,
		sources,
		competitorNames: competitors.names,
	};
}
