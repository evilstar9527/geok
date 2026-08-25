import type { Source } from "@oneglanse/types";
import type { Page } from "playwright";
import { type RawSource, buildSources } from "../../_shared/sourceUtils.js";

/**
 * Kimi 的引用来源提取。
 *
 * 与 DeepSeek/豆包一致:联网检索的参考来源直接内联在回答下方,没有独立的
 * sources 面板按钮,因此从已渲染的 DOM 抓即可,不需要开关面板那套流程。
 *
 * 抓取范围限定在回答容器(类名含 markdown/response)内,避免把侧边栏的
 * 历史会话或推荐链接误当成引用来源。
 */
export const KIMI_RAW_SOURCES_DOM_EXTRACTOR = String.raw`(_helpers) => {
	const results = [];
	const seen = new Set();

	const isInternalLink = (href) => {
		try {
			const host = new URL(href).hostname.toLowerCase();
			return (
				host === "kimi.com" ||
				host.endsWith(".kimi.com") ||
				host === "kimi.moonshot.cn" ||
				host.endsWith(".kimi.moonshot.cn") ||
				host === "moonshot.cn" ||
				host.endsWith(".moonshot.cn")
			);
		} catch {
			return true;
		}
	};

	// 优先在回答容器内查找,取不到再退回 main,避免抓到侧边栏历史会话链接。
	const scopes = Array.from(
		document.querySelectorAll('div[class*="markdown"], div[class*="response"]'),
	);
	const roots = scopes.length > 0 ? scopes : [document.querySelector("main") || document.body];

	for (const root of roots) {
		if (!root) continue;

		for (const anchor of Array.from(root.querySelectorAll('a[href^="http"]'))) {
			if (!(anchor instanceof HTMLAnchorElement)) continue;

			const rawHref = anchor.href.replace(/#.*$/, "");
			if (!rawHref || isInternalLink(rawHref)) continue;
			if (seen.has(rawHref)) continue;
			seen.add(rawHref);

			let title = (anchor.textContent || "").replace(/\s+/g, " ").trim();
			if (title.length <= 3) {
				const card = anchor.closest('[class*="card"], li, [class*="source"]');
				const cardText = card ? (card.textContent || "").replace(/\s+/g, " ").trim() : "";
				if (cardText.length > title.length) title = cardText;
			}
			if (!title) {
				try {
					title = new URL(rawHref).hostname;
				} catch {
					title = rawHref;
				}
			}

			results.push({
				rawHref,
				title: title.slice(0, 300),
				citedText: "",
			});
		}
	}

	return results;
}`;

export async function extractSourcesFromKimi(page: Page): Promise<Source[]> {
	const rawSources = (await page.runDomOp("raw-sources", {
		provider: "kimi",
	})) as RawSource[];

	return buildSources(rawSources, { provider: "kimi" });
}
