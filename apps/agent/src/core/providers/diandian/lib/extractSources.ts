import type { Source } from "@oneglanse/types";
import type { Page } from "playwright";
import { type RawSource, buildSources } from "../../_shared/sourceUtils.js";

/**
 * 点点的核心卖点是引用小红书笔记本身,所以和其它 provider 不同,这里
 * 不排除 xiaohongshu.com 域名下的链接 —— 那些笔记链接就是真正的引用来源。
 * 具体的来源卡片 DOM 结构未实测,先按通用 markdown/回答容器里的 <a> 标签
 * 兜底抓取,后续接入真实页面后再补充专属选择器。
 */
export const DIANDIAN_RAW_SOURCES_DOM_EXTRACTOR = String.raw`(_helpers) => {
	const results = [];
	const seen = new Set();

	const scopes = Array.from(
		document.querySelectorAll(
			'div[class*="markdown"], div[class*="answer"], div[class*="response"], div[class*="message"]',
		),
	);
	const roots = scopes.length > 0
		? scopes
		: [document.querySelector("main") || document.body];

	for (const root of roots) {
		if (!root) continue;

		for (const anchor of Array.from(root.querySelectorAll('a[href^="http"]'))) {
			if (!(anchor instanceof HTMLAnchorElement)) continue;

			const rawHref = anchor.href.replace(/#.*$/, "");
			if (!rawHref || seen.has(rawHref)) continue;
			seen.add(rawHref);

			let title = (anchor.textContent || "").replace(/\s+/g, " ").trim();
			let citedText = "";
			const card = anchor.closest(
				'[class*="source"], [class*="reference"], [class*="citation"], [class*="card"], li',
			);
			if (card) {
				const cardText = (card.textContent || "").replace(/\s+/g, " ").trim();
				if (title.length <= 3 && cardText.length > title.length) title = cardText;
				citedText = cardText === title ? "" : cardText;
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
				citedText: citedText.slice(0, 1000),
			});
		}
	}

	return results;
}`;

export async function extractSourcesFromDiandian(page: Page): Promise<Source[]> {
	const rawSources = (await page.runDomOp("raw-sources", {
		provider: "diandian",
	})) as RawSource[];

	return buildSources(rawSources, { provider: "diandian" });
}
