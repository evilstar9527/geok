import type { Source } from "@oneglanse/types";
import type { Page } from "playwright";
import { type RawSource, buildSources } from "../../_shared/sourceUtils.js";

/**
 * 元宝的引用来源提取。
 *
 * 与豆包/DeepSeek 相同:元宝没有独立的 sources 面板按钮,联网检索的
 * 参考来源直接内联在回答正文里(以及正文中的角标),因此不需要 findSourcesButton +
 * openSourcesPanel 那套开关面板的流程 —— 直接从已渲染的 DOM 抓即可。
 *
 * 抓取范围限定在最后一条 AI 回答容器内,避免把历史会话、侧边栏推荐等
 * 内部链接误当成引用来源。
 */
export const YUANBAO_RAW_SOURCES_DOM_EXTRACTOR = String.raw`(_helpers) => {
	const results = [];
	const seen = new Set();

	// 抓取范围限定在回答正文容器,退回 main,避免抓到侧边栏内部链接。
	const containers = Array.from(
		document.querySelectorAll('div[class*="markdown"], div[class*="answer"], div[class*="response"]'),
	);
	const roots = containers.length > 0 ? containers : [document.querySelector("main") || document.body];

	const isInternalLink = (href) => {
		try {
			const host = new URL(href).hostname.toLowerCase();
			return (
				host === "yuanbao.tencent.com" ||
				host.endsWith(".yuanbao.tencent.com") ||
				host === "tencent.com" ||
				host.endsWith(".tencent.com")
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

export async function extractSourcesFromYuanbao(page: Page): Promise<Source[]> {
	const rawSources = (await page.runDomOp("raw-sources", {
		provider: "yuanbao",
	})) as RawSource[];

	return buildSources(rawSources, { provider: "yuanbao" });
}
