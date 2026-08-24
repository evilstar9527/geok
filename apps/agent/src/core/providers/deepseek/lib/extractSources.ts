import type { Source } from "@oneglanse/types";
import type { Page } from "playwright";
import { type RawSource, buildSources } from "../../_shared/sourceUtils.js";

/**
 * DeepSeek 的引用来源提取。
 *
 * 只有开启「联网搜索」时才会有引用;纯模型回答没有来源,此时返回空数组是
 * 正确结果而非失败 —— 这一点对 GEO 判读很关键:DeepSeek 未联网时的回答
 * 反映的是训练语料里的品牌认知,联网后反映的是检索信源,两者要分开看。
 */
export const DEEPSEEK_RAW_SOURCES_DOM_EXTRACTOR = String.raw`(_helpers) => {
	const results = [];
	const seen = new Set();

	const isInternalLink = (href) => {
		try {
			const host = new URL(href).hostname.toLowerCase();
			return host === "deepseek.com" || host.endsWith(".deepseek.com");
		} catch {
			return true;
		}
	};

	// 优先在回答容器内查找,取不到再退回 main,避免抓到侧边栏历史会话链接。
	const scopes = Array.from(
		document.querySelectorAll('div.ds-markdown, div[class*="ds-markdown"]'),
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

export async function extractSourcesFromDeepseek(
	page: Page,
): Promise<Source[]> {
	const rawSources = (await page.runDomOp("raw-sources", {
		provider: "deepseek",
	})) as RawSource[];

	return buildSources(rawSources, { provider: "deepseek" });
}
