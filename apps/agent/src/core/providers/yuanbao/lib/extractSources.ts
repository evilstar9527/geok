import type { Source } from "@oneglanse/types";
import type { Page } from "playwright";
import { type RawSource, buildSources } from "../../_shared/sourceUtils.js";

/**
 * 元宝的引用来源提取。
 *
 * 元宝新版把引用折叠在回答工具栏的 Sources 面板中。卡片不是 a 标签，
 * URL 分别存放在 data-url / dt-ext6 属性中。
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

	for (const card of Array.from(
		document.querySelectorAll(
			'#chatReferenceList [data-url], #chatReferenceList [dt-ext6]',
		),
	)) {
		if (!(card instanceof HTMLElement)) continue;
		const rawHref =
			card.getAttribute("data-url") || card.getAttribute("dt-ext6") || "";
		if (!rawHref || isInternalLink(rawHref) || seen.has(rawHref)) continue;
		seen.add(rawHref);

		const root = card.closest("li") || card;
		const title =
			root.querySelector("h4")?.textContent?.replace(/\s+/g, " ").trim() ||
			root.querySelector('[class*="source_txt"]')?.textContent?.replace(/\s+/g, " ").trim() ||
			new URL(rawHref).hostname;
		const citedText =
			root.querySelector("p")?.textContent?.replace(/\s+/g, " ").trim() || "";
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
	// 引用面板是抽屉式的,而 [data-toolbar-type="citation"] 是开关按钮:
	// 面板已经打开时再点一次会把它关掉,后面的查询就什么都拿不到。
	// 所以先判断面板是否已在页面上,只在没打开时才点。
	const referenceList = page.locator("#chatReferenceList");
	const alreadyOpen = await referenceList.isVisible().catch(() => false);

	if (!alreadyOpen) {
		// 引用按钮是在回答结束后才挂上工具栏的,和「正文不再变化」不是同一时刻。
		// 提取紧跟在 waitForResponse 之后,有时会早于按钮出现 —— 实测同一批 3 条里
		// 有 1 条因此拿到 0 条来源。这里给一个有界等待,超时就按没有引用处理。
		await page
			.waitForSelector('[data-toolbar-type="citation"]', {
				state: "visible",
				timeout: 5_000,
			})
			.catch(() => null);

		const sourcesButton = page.locator('[data-toolbar-type="citation"]').last();
		if (
			(await sourcesButton.count().catch(() => 0)) > 0 &&
			(await sourcesButton.isVisible().catch(() => false))
		) {
			await sourcesButton.click({ timeout: 5_000 }).catch(() => null);
			await page
				.waitForSelector("#chatReferenceList", {
					state: "visible",
					timeout: 5_000,
				})
				.catch(() => null);
		}
	}

	// 抽屉可见和列表项渲染完不是同一件事 —— 打开动画期间 __list 还是空的,
	// 立刻查询会拿到 0 条。等第一项出现再继续,超时不抛错,交给下面的空结果。
	await page
		.waitForSelector(
			"#chatReferenceList [data-url], #chatReferenceList [dt-ext6]",
			{
				state: "attached",
				timeout: 5_000,
			},
		)
		.catch(() => null);

	const rawSources = (await page.runDomOp("raw-sources", {
		provider: "yuanbao",
	})) as RawSource[];

	return buildSources(rawSources, { provider: "yuanbao" });
}
