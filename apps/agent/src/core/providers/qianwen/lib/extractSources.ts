import type { Source } from "@oneglanse/types";
import type { Page } from "playwright";
import { type RawSource, buildSources } from "../../_shared/sourceUtils.js";

/**
 * 千问联网检索来源通常以内联角标或回答末尾来源卡片呈现。
 * 只扫描回答区域，并过滤千问/阿里自身的页面链接。
 */
export const QIANWEN_RAW_SOURCES_DOM_EXTRACTOR = String.raw`(_helpers) => {
	const results = [];
	const seen = new Set();

	const isInternalLink = (href) => {
		try {
			const host = new URL(href).hostname.toLowerCase();
			return (
				host === "qianwen.com" ||
				host.endsWith(".qianwen.com") ||
				host === "tongyi.aliyun.com" ||
				host.endsWith(".tongyi.aliyun.com")
			);
		} catch {
			return true;
		}
	};

	const scopes = Array.from(
		document.querySelectorAll(
			'div[class*="markdown"], div[class*="answer"], div[class*="response"], div[class*="message-content"]',
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
			if (!rawHref || isInternalLink(rawHref) || seen.has(rawHref)) continue;
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

export async function extractSourcesFromQianwen(page: Page): Promise<Source[]> {
	const rawSources = (await page.runDomOp("raw-sources", {
		provider: "qianwen",
	})) as RawSource[];

	return buildSources(rawSources, { provider: "qianwen" });
}
