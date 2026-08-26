import { getDomain } from "../url/getDomain.js";

export type SourceMediaType =
	| "industry_media"
	| "portal"
	| "official"
	| "news"
	| "social"
	| "community"
	| "encyclopedia"
	| "search"
	| "government"
	| "academic"
	| "other";

export type SourceMediaDefinition = {
	key: SourceMediaType;
	label: string;
	color: string;
};

export const SOURCE_MEDIA_DEFINITIONS: SourceMediaDefinition[] = [
	{ key: "industry_media", label: "垂直行业媒体", color: "#4f7ddd" },
	{ key: "portal", label: "商业门户网站", color: "#4da8bb" },
	{ key: "official", label: "官网", color: "#55aa84" },
	{ key: "news", label: "新闻媒体", color: "#df9b39" },
	{ key: "social", label: "社交媒体", color: "#d2517f" },
	{ key: "community", label: "问答社区", color: "#775ed5" },
	{ key: "encyclopedia", label: "百科", color: "#4fa5c1" },
	{ key: "search", label: "搜索引擎", color: "#54a99d" },
	{ key: "government", label: "政府与机构", color: "#d4544f" },
	{ key: "academic", label: "学术教育", color: "#6570d9" },
	{ key: "other", label: "其他", color: "#8d98a8" },
];

const DOMAIN_RULES: Array<{
	patterns: string[];
	type: SourceMediaType;
}> = [
	{
		patterns: ["baike.baidu.com", "wikipedia.org", "baike.com", "wiki"],
		type: "encyclopedia",
	},
	{
		patterns: ["zhihu.com", "quora.com", "reddit.com", "tieba.baidu.com"],
		type: "community",
	},
	{
		patterns: [
			"weibo.com",
			"xiaohongshu.com",
			"douyin.com",
			"tiktok.com",
			"youtube.com",
			"bilibili.com",
			"facebook.com",
			"instagram.com",
			"linkedin.com",
		],
		type: "social",
	},
	{
		patterns: [
			"news.",
			"toutiao.com",
			"thepaper.cn",
			"xinhuanet.com",
			"people.com.cn",
			"chinanews.com",
			"reuters.com",
			"bloomberg.com",
			"bbc.",
			"cnn.com",
		],
		type: "news",
	},
	{
		patterns: [
			"sina.com.cn",
			"sohu.com",
			"163.com",
			"qq.com",
			"ifeng.com",
			"yahoo.com",
			"msn.com",
		],
		type: "portal",
	},
	{
		patterns: ["baidu.com", "bing.com", "google.com", "sogou.com", "so.com"],
		type: "search",
	},
];

function matchesDomain(domain: string, pattern: string): boolean {
	return (
		domain === pattern ||
		domain.endsWith(`.${pattern}`) ||
		domain.includes(pattern)
	);
}

export function classifySourceMedia(
	urlOrDomain: string,
	brandDomain?: string,
): SourceMediaType {
	const domain = getDomain(urlOrDomain) || urlOrDomain.toLowerCase();
	const normalizedBrandDomain = brandDomain
		? getDomain(brandDomain) || brandDomain.toLowerCase()
		: "";

	if (
		normalizedBrandDomain &&
		(domain === normalizedBrandDomain ||
			domain.endsWith(`.${normalizedBrandDomain}`))
	) {
		return "official";
	}
	if (domain.endsWith(".gov.cn") || domain.endsWith(".gov")) {
		return "government";
	}
	if (
		domain.endsWith(".edu.cn") ||
		domain.endsWith(".edu") ||
		domain.includes("scholar.google")
	) {
		return "academic";
	}

	for (const rule of DOMAIN_RULES) {
		if (rule.patterns.some((pattern) => matchesDomain(domain, pattern))) {
			return rule.type;
		}
	}

	return "other";
}

export function getSourceMediaDefinition(
	type: SourceMediaType,
): SourceMediaDefinition {
	return (
		SOURCE_MEDIA_DEFINITIONS.find((definition) => definition.key === type) ?? {
			key: "other",
			label: "其他",
			color: "#8d98a8",
		}
	);
}
