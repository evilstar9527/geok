import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";

// 显式放行 AI 爬虫。默认的 `*` 规则已经允许，但逐个列出可以让这些 bot 的
// 运维方在日志里看到明确的许可，也是 GEO 原则 8 的第一项检查。
const AI_CRAWLERS = [
	"GPTBot",
	"ChatGPT-User",
	"OAI-SearchBot",
	"ClaudeBot",
	"anthropic-ai",
	"Claude-User",
	"PerplexityBot",
	"Perplexity-User",
	"Google-Extended",
	"Googlebot",
	"Bingbot",
	"CCBot",
	"cohere-ai",
	"Applebot-Extended",
	"Bytespider",
	"meta-externalagent",
] as const;

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{ userAgent: "*", allow: "/" },
			...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/" })),
		],
		sitemap: `${SITE_URL}/sitemap.xml`,
	};
}
