const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

// Canonical origin for every public URL the landing site emits: canonical tags,
// Open Graph, sitemap, robots.txt and llms.txt. Set NEXT_PUBLIC_SITE_URL at build
// time. The fallback is an RFC 2606 reserved domain, so a build that forgets to
// set it can never point crawlers at somebody else's site.
export const SITE_URL = trimTrailingSlash(
	process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://geok.cloud",
);

export const SITE_NAME = "秘蜂赢客";

export const SITE_TAGLINE =
	"开源的 GEO 与 AI 可见度追踪工具，覆盖 ChatGPT、Gemini、Perplexity、Claude、Google AI Overview 与 6 个国产大模型";

export const SITE_DESCRIPTION =
	"GEOK 追踪品牌在 AI 生成回答中的可见度：GEO 评分、排名位置、情感倾向、竞品共现与引用来源。覆盖 ChatGPT、Gemini、Perplexity、Claude、Google AI Overview，以及豆包、DeepSeek、Kimi、元宝、千问、点点共 11 个渠道。完全自托管，代码开源。";

export const GITHUB_URL =
	process.env.NEXT_PUBLIC_GITHUB_REPO_URL?.trim() ||
	"https://github.com/evilstar9527/geok";

export const DOCS_URL = trimTrailingSlash(
	process.env.NEXT_PUBLIC_DOCS_URL?.trim() || "https://docs.geok.cloud",
);

// GEOK is a fork of OneGlanse. Attribution is kept explicit and machine-readable
// (schema.org isBasedOn) so AI engines can tell the upstream project apart from
// GEOK's own identity instead of merging the two entities.
export const UPSTREAM = {
	name: "OneGlanse",
	url: "https://github.com/aryamantodkar/oneglanse",
	license: "MIT",
} as const;

export const SITE_LINKS = {
	homepage: SITE_URL,
	docs: DOCS_URL,
	github: GITHUB_URL,
	license: `${GITHUB_URL}/blob/main/LICENSE`,
} as const;

// GEOK 的渠道覆盖是它相对其它 GEO 工具的核心差异点，llms.txt / llms-full.txt /
// 结构化数据都要用到同一份列表，集中在这里避免各处写法漂移。
export const CN_CHANNELS = [
	"豆包",
	"DeepSeek",
	"Kimi",
	"元宝",
	"千问",
	"点点",
] as const;

export const GLOBAL_CHANNELS = [
	"ChatGPT",
	"Gemini",
	"Perplexity",
	"Claude",
	"Google AI Overview",
] as const;

export const SUPPORTED_CHANNELS = [...GLOBAL_CHANNELS, ...CN_CHANNELS] as const;
