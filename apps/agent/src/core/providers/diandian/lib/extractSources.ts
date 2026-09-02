import type { Source } from "@oneglanse/types";
import type { Page } from "playwright";
import { type RawSource, buildSources } from "../../_shared/sourceUtils.js";

const NOTE_ITEM_SELECTOR = "section.note-item";
const REFERENCE_TOGGLE_SELECTOR =
	'.progress-wrapper[data-has-reference="true"]';
const DRAWER_SCROLLER_SELECTOR = ".drawer-scroll-container";

/**
 * 点点的引用来源不在回答正文里 —— 正文容器里一个 <a> 都没有。真正的引用是
 * 「ai总结 N 篇笔记生成」那个入口点开后,右侧 div.drawer(参考来源)里的
 * section.note-item 卡片。所以抓取必须先点开抽屉,再滚动累积(列表是虚拟的,
 * 只渲染可见卡片)。
 *
 * 每张卡片里有两种链接:
 *   a[href^="/explore/<noteId>"]        —— display:none 的规范链接,不带 token
 *   a.cover / a.title[href^="/search_result/…?xsec_token=…"] —— 带轮换 token
 * 这里取规范链接:xsec_token 每次请求都变,用它当 URL 会让 buildSources 的
 * 去重键和跨次聚合彻底失效(同一篇笔记会被算成多个信源)。
 *
 * 另外点点的卖点就是引用小红书笔记本身,所以 PROVIDER_OWNED_SOURCE_DOMAINS
 * 里刻意没有 diandian 条目 —— xiaohongshu.com 链接不能被当成「自家域名」过滤掉。
 */
export const DIANDIAN_RAW_SOURCES_DOM_EXTRACTOR = String.raw`(_helpers) => {
	const results = [];
	const seen = new Set();
	const text = (el) =>
		el && el.textContent ? el.textContent.replace(/\s+/g, " ").trim() : "";

	for (const card of Array.from(document.querySelectorAll("section.note-item"))) {
		const titleAnchor = card.querySelector("a.title");
		// 规范链接优先;拿不到就退回带 token 的标题链接。
		const anchor = card.querySelector('a[href^="/explore/"]') || titleAnchor;
		if (!(anchor instanceof HTMLAnchorElement)) continue;

		// anchor.href 已经是浏览器解析过的绝对地址,相对 href 也能拿到完整 URL。
		const rawHref = anchor.href.replace(/#.*$/, "");
		if (!rawHref || seen.has(rawHref)) continue;
		seen.add(rawHref);

		// 卡片里没有笔记正文,只有标题 + 作者/日期;纯图片笔记可能没有标题。
		let title = text(titleAnchor);
		if (!title) title = text(card.querySelector(".name-time-wrapper .name"));
		if (!title) {
			const match = rawHref.match(/\/explore\/([0-9a-zA-Z]+)/);
			title = match ? "小红书笔记 " + match[1] : "小红书笔记";
		}

		results.push({ rawHref, title: title.slice(0, 300), citedText: "" });
	}

	return results;
}`;

/**
 * 点开「参考来源」抽屉。抽屉已经开着时直接返回 true。
 */
async function openReferenceDrawer(page: Page): Promise<boolean> {
	const alreadyOpen = await page
		.locator(NOTE_ITEM_SELECTOR)
		.first()
		.isVisible()
		.catch(() => false);
	if (alreadyOpen) return true;

	const toggle = page.locator(REFERENCE_TOGGLE_SELECTOR).last();
	if ((await toggle.count().catch(() => 0)) === 0) return false;

	await toggle.click({ timeout: 4_000 }).catch(() => null);
	let opened = await page
		.waitForSelector(NOTE_ITEM_SELECTOR, { state: "visible", timeout: 2_000 })
		.then(() => true)
		.catch(() => false);

	if (!opened) {
		await toggle.dispatchClick().catch(() => null);
		opened = await page
			.waitForSelector(NOTE_ITEM_SELECTOR, { state: "visible", timeout: 2_000 })
			.then(() => true)
			.catch(() => false);
	}

	return opened;
}

/**
 * 往下滚一屏,返回 scrollTop 是否真的变了(没变说明已经到底)。
 */
async function scrollDrawer(page: Page, selector: string): Promise<boolean> {
	return await page
		.evaluate((sel) => {
			const scroller = document.querySelector(sel);
			if (!(scroller instanceof HTMLElement)) return false;
			const before = scroller.scrollTop;
			scroller.scrollTop = before + Math.max(240, scroller.clientHeight - 80);
			return scroller.scrollTop > before;
		}, selector)
		.catch(() => false);
}

export async function extractSourcesFromDiandian(
	page: Page,
): Promise<Source[]> {
	// 调用方 executePrompt 给信源抽取套了 20s 硬超时,超时会抛错让整条 prompt
	// 重跑、连已经拿到的回答一起丢掉。所以这里自己卡住预算,宁可少滚几屏。
	const deadline = Date.now() + 15_000;

	if (!(await openReferenceDrawer(page))) {
		// 没有引用入口(比如问题没走检索),回答里也不会有信源。
		return [];
	}
	await page.waitForTimeout(300);

	// 列表是虚拟的,只渲染可见卡片,不滚就会漏。
	// 每轮把当前可见卡片累积起来,交给 buildSources 去重。
	const collected: RawSource[] = [];
	const seenHrefs = new Set<string>();
	let staleRounds = 0;

	while (Date.now() < deadline) {
		const rawSources = (await page.runDomOp("raw-sources", {
			provider: "diandian",
		})) as RawSource[];

		let added = 0;
		for (const raw of rawSources) {
			if (seenHrefs.has(raw.rawHref)) continue;
			seenHrefs.add(raw.rawHref);
			collected.push(raw);
			added += 1;
		}

		const scrolled = await scrollDrawer(page, DRAWER_SCROLLER_SELECTOR);
		if (!scrolled) break;

		// 滚动了但一张新卡片都没多出来,连续两轮就认为到底了。
		staleRounds = added > 0 ? 0 : staleRounds + 1;
		if (staleRounds >= 2) break;

		await page.waitForTimeout(250);
	}

	return buildSources(collected, { provider: "diandian" });
}
