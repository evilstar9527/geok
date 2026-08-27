import type { Source } from "@oneglanse/types";
import type { Page } from "playwright";
import { type RawSource, buildSources } from "../../_shared/sourceUtils.js";

/**
 * 豆包的引用来源提取。
 *
 * 豆包新版把来源折叠在回答上方的「搜索 N 个关键词，参考 N 篇资料」面板中。
 * 面板打开后来源才会以真实 a[href] 渲染，因此提取前必须先点击展开。
 */
export const DOUBAO_RAW_SOURCES_DOM_EXTRACTOR = String.raw`(_helpers) => {
	const results = [];
	const seen = new Set();

	const containers = Array.from(
		document.querySelectorAll('[data-testid="receive_message"]'),
	);
	const sourcePanels = Array.from(
		document.querySelectorAll('[data-thinking-box-tool-call="true"]'),
	);
	const roots = sourcePanels.length > 0
		? sourcePanels
		: containers.length > 0
			? containers
			: [document.querySelector("main") || document.body];

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
	const sourcesButton = page
		.locator(
			'[data-plugin-identifier*="search_query_result"] [data-copy-ignore]',
		)
		.last();
	if (
		(await sourcesButton.count().catch(() => 0)) > 0 &&
		(await sourcesButton.isVisible().catch(() => false))
	) {
		await sourcesButton.click({ timeout: 5_000 }).catch(() => null);
		await page.waitForTimeout(500);
	}

	const rawSources = (await page.runDomOp("raw-sources", {
		provider: "doubao",
	})) as RawSource[];

	return buildSources(rawSources, { provider: "doubao" });
}
