import type { Source } from "@oneglanse/types";
import type { Page } from "playwright";
import { type RawSource, buildSources } from "../../_shared/sourceUtils.js";

/**
 * 千问新版把来源折叠在「N 篇来源」面板中。来源卡片不是 a 标签，
 * URL 和标题存放在 data-click-extra / data-log-params JSON 属性中。
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

	for (const card of Array.from(
		document.querySelectorAll('[data-c="refer_panel"][data-d="card"]'),
	)) {
		if (!(card instanceof HTMLElement)) continue;
		const payloadText =
			card.getAttribute("data-click-extra") ||
			card.getAttribute("data-log-params") ||
			"";
		let payload = {};
		try {
			payload = JSON.parse(payloadText);
		} catch {}
		const rawHref = payload.url || payload.ref_url || "";
		if (!rawHref || isInternalLink(rawHref) || seen.has(rawHref)) continue;
		seen.add(rawHref);

		const title =
			payload.title ||
			card.querySelector('[class*="title"]')?.textContent?.replace(/\s+/g, " ").trim() ||
			new URL(rawHref).hostname;
		const citedText =
			card.querySelector('[class*="content"]')?.textContent?.replace(/\s+/g, " ").trim() || "";
		results.push({
			rawHref,
			title: title.slice(0, 300),
			citedText: citedText.slice(0, 1000),
		});
	}

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
	const sourcesButton = page
		.locator('div[class*="reference-wrap"] div[class*="link-title"]')
		.last();
	if (
		(await sourcesButton.count().catch(() => 0)) > 0 &&
		(await sourcesButton.isVisible().catch(() => false))
	) {
		await sourcesButton.click({ timeout: 5_000 }).catch(() => null);
		await page
			.waitForSelector('[data-c="refer_panel"][data-d="card"]', {
				state: "visible",
				timeout: 5_000,
			})
			.catch(() => null);
	}

	const rawSources = (await page.runDomOp("raw-sources", {
		provider: "qianwen",
	})) as RawSource[];

	return buildSources(rawSources, { provider: "qianwen" });
}
