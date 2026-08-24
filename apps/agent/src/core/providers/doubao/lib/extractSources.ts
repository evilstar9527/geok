import type { Source } from "@oneglanse/types";
import type { Page } from "playwright";
import { type RawSource, buildSources } from "../../_shared/sourceUtils.js";

/**
 * 豆包的引用来源提取。
 *
 * 与 ChatGPT/Perplexity 的差异:豆包没有独立的 sources 面板按钮,联网检索的
 * 参考来源直接内联在回答下方(以及正文中的角标),因此不需要 findSourcesButton +
 * openSourcesPanel 那套开关面板的流程 —— 直接从已渲染的 DOM 抓即可。
 *
 * 抓取范围限定在 receive_message 容器内,避免把侧边栏「为你推荐」的热点链接
 * 误当成引用来源。
 */
export const DOUBAO_RAW_SOURCES_DOM_EXTRACTOR = String.raw`(_helpers) => {
	const results = [];
	const seen = new Set();

	const containers = Array.from(
		document.querySelectorAll('[data-testid="receive_message"]'),
	);
	// 回答容器还没渲染出来时退回整个 main,避免直接返回空数组。
	const roots = containers.length > 0 ? containers : [document.querySelector("main") || document.body];

	const isInternalLink = (href) => {
		try {
			const host = new URL(href).hostname.toLowerCase();
			return (
				host === "doubao.com" ||
				host.endsWith(".doubao.com") ||
				host.endsWith(".bytedance.com") ||
				host.endsWith(".byteimg.com")
			);
		} catch {
			return true;
		}
	};

	for (const root of roots) {
		if (!root) continue;

		for (const anchor of Array.from(root.querySelectorAll('a[href^="http"]'))) {
			if (!(anchor instanceof HTMLAnchorElement)) continue;

			const rawHref = anchor.href.replace(/#.*$/, "");
			if (!rawHref || isInternalLink(rawHref)) continue;
			if (seen.has(rawHref)) continue;
			seen.add(rawHref);

			// 角标链接(如「1」「2」)本身没有有意义的标题,尝试从最近的
			// 卡片容器里取文本;取不到就用域名兜底,让来源至少可被统计。
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

export async function extractSourcesFromDoubao(page: Page): Promise<Source[]> {
	const rawSources = (await page.runDomOp("raw-sources", {
		provider: "doubao",
	})) as RawSource[];

	return buildSources(rawSources, { provider: "doubao" });
}
