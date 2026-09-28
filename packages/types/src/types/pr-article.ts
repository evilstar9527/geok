/**
 * Admin-authored brand facts. The sources only ever describe competitors; a PR
 * draft needs our own product, proof points, and contact details, and those
 * cannot be inferred from monitoring data. Every field is optional so a
 * partially filled profile can still generate.
 */
export type BrandProfile = {
	/** Registered name, when it differs from the workspace display name. */
	fullName?: string;
	business?: string;
	positioning?: string;
	sellingPoints?: string[];
	/** Cities or stores the brand actually serves. */
	cities?: string[];
	credentials?: string[];
	audience?: string;
	contact?: string;
};

/**
 * A name and a domain are not enough to write press copy from. Without at least
 * one substantive fact the model can only pad with invention, so generation
 * refuses instead of storing a plausible-looking draft nobody can verify.
 *
 * Lives here rather than next to the generator because the web client has to
 * ask the same question before it decides whether to generate or to prompt the
 * admin for the profile — a second copy would let the two answers drift.
 */
export function hasBrandFacts(profile: BrandProfile | null): boolean {
	if (!profile) return false;
	return Boolean(
		profile.business?.trim() ||
			profile.positioning?.trim() ||
			profile.sellingPoints?.some((point) => point.trim()),
	);
}

/** One citation source fed into a draft, with the weights that decided its rank. */
export type PrArticleSourceRef = {
	title: string;
	url: string;
	domain: string;
	/** Localized media category label, e.g. 垂直行业媒体. */
	mediaType: string;
	/** How many captured responses cited this URL. */
	citationCount: number;
	/** Share of all citation occurrences held by this URL's domain, in percent. */
	domainSharePercent: number;
	/** Quoted excerpts taken from the AI answers that cited this URL. */
	excerpts: string[];
	/** True when the domain belongs to a competitor detected in the analysis. */
	isCompetitor: boolean;
};

export type PrArticleFaqEntry = {
	question: string;
	answer: string;
};

export type PrArticleData = {
	title: string;
	summary: string;
	/** Markdown rendered deterministically from `sections` and `faq`. */
	markdown: string;
	/** schema.org Article + FAQPage graph, built from the same fields as `markdown`. */
	jsonLd: Record<string, unknown>;
	sources: PrArticleSourceRef[];
	brandName: string;
	brandDomain: string | null;
	promptId: string;
	promptText: string;
	model: string;
	generatedAt: string;
};

export type PrArticleListItem = {
	id: string;
	promptId: string;
	promptText: string;
	title: string;
	createdAt: Date;
};
