import { TOOL_URL } from "../lib/paths.mjs";

export const CN = {
	langLabel: "EN",
	cta: "申请免费诊断",
	kicker: "BLOG",
	title: "GEO 观察",
	lead: "关于生成式引擎优化的方法、数据与实操记录。内容为示例占位，正式上线前替换为真实文章。",
	featuredLabel: "置顶",
	read: "阅读全文",
	tocLabel: "文章要点",
	moreNote: "更多文章正在整理中。文章详情页将以 /blog/[slug].html 的形式发布。",
	copy: "© 2026 见客 JianKe. All rights reserved.",
	icp: "京ICP备00000000号",
	cats: ["全部", "方法论", "行业数据", "平台观察", "实操案例"],
	featured: {
		cat: "方法论",
		title: "AI 不是搜索引擎：为什么 SEO 那套在 GEO 里会失效",
		excerpt:
			"关键词密度、外链数量这些排名信号，在生成式回答里不再直接起作用。模型关心的是能否找到一段可被引用、事实一致、结构清晰的内容。这篇文章拆解两者的六个关键差异。",
		meta: "示例文章 · 2026.08.28 · 约 9 分钟",
		href: "/blog/",
		toc: [
			"排名信号 vs 引用信号",
			"模型如何选择信源",
			"结构化内容的实际作用",
			"为什么官网改造要先做 FAQ",
			"如何验证效果",
		],
	},
	posts: [
		{
			cat: "行业数据",
			title: "Gartner 的两个预测，对中小企业到底意味着什么",
			excerpt:
				"传统搜索流量下降 25%、品牌自然流量下降 50%，这两个数字背后的时间表和应对窗口。",
			meta: "示例文章 · 2026.08.20",
			href: "/blog/",
		},
		{
			cat: "平台观察",
			title: "DeepSeek、豆包、Kimi 的引用偏好有什么不同",
			excerpt:
				"同一批问题在三个国内平台上的信源分布对比，以及对内容布局的启示。",
			meta: "示例文章 · 2026.08.12",
			href: "/blog/",
		},
		{
			cat: "实操案例",
			title: "一家工业制造企业，如何在三个月内进入推荐名单",
			excerpt: "从零提及到稳定进入前五的完整改动清单与时间线。",
			meta: "示例文章 · 2026.08.05",
			href: "/case-studies/",
		},
		{
			cat: "方法论",
			title: "如何设计一套真正有效的 GEO 问题库",
			excerpt:
				"问题库决定了你监测到的是不是客户真正会问的问题。四类问题的配比建议。",
			meta: "示例文章 · 2026.07.29",
			href: "/blog/",
		},
		{
			cat: "方法论",
			title: "结构化数据在 AI 检索中的位置",
			excerpt: "Schema 标记还有用吗？在生成式检索链路里它作用于哪一环。",
			meta: "示例文章 · 2026.07.18",
			href: "/blog/",
		},
		{
			cat: "平台观察",
			title: "海外平台的本地化陷阱：中文内容不会自动被理解",
			excerpt: "出海企业常见的三个内容错配，以及最低成本的修复顺序。",
			meta: "示例文章 · 2026.07.09",
			href: "/blog/",
		},
	],
	nav: [
		{ label: "首页", href: "/", target: "_self" },
		{ label: "服务方案", href: "/#service-tiers", target: "_self" },
		{ label: "客户案例", href: "/case-studies/", target: "_self" },
		{ label: "关于我们", href: "/#about", target: "_self" },
		{ label: "监测平台 ↗", href: TOOL_URL, target: "_blank" },
	],
};

export const EN = {
	langLabel: "中文",
	cta: "Request a free audit",
	kicker: "BLOG",
	title: "GEO Notes",
	lead: "Methods, data and field notes on generative engine optimization. Articles below are placeholders and will be replaced before launch.",
	featuredLabel: "Featured",
	read: "Read the article",
	tocLabel: "In this article",
	moreNote:
		"More articles in progress. Detail pages will publish at /blog/[slug].html.",
	copy: "© 2026 JianKe. All rights reserved.",
	icp: "ICP No. 00000000",
	cats: ["All", "Method", "Market data", "Platforms", "Field notes"],
	featured: {
		cat: "Method",
		title: "AI is not a search engine: why the SEO playbook breaks in GEO",
		excerpt:
			"Keyword density and backlink counts no longer act as direct signals inside generated answers. What models care about is finding a passage that is citable, factually consistent and clearly structured. Six differences, unpacked.",
		meta: "Sample article · 2026.08.28 · 9 min read",
		href: "/blog/",
		toc: [
			"Ranking signals vs citation signals",
			"How models choose sources",
			"What structure actually does",
			"Why site work starts with FAQs",
			"How to verify results",
		],
	},
	posts: [
		{
			cat: "Market data",
			title: "What Gartner's two forecasts mean for a small business",
			excerpt:
				"A 25% drop in search volume and a 50% drop in brand organic traffic — the timeline behind the numbers.",
			meta: "Sample · 2026.08.20",
			href: "/blog/",
		},
		{
			cat: "Platforms",
			title: "How DeepSeek, Doubao and Kimi differ in what they cite",
			excerpt:
				"Source distribution across three Chinese platforms on the same prompt set, and what it implies for content.",
			meta: "Sample · 2026.08.12",
			href: "/blog/",
		},
		{
			cat: "Field notes",
			title:
				"A manufacturer's three months from zero mentions to the shortlist",
			excerpt: "The full change list and timeline behind a top-five position.",
			meta: "Sample · 2026.08.05",
			href: "/case-studies/",
		},
		{
			cat: "Method",
			title: "Designing a prompt set that reflects real buyer questions",
			excerpt:
				"Your prompt set decides what you can see. Suggested balance across the four question types.",
			meta: "Sample · 2026.07.29",
			href: "/blog/",
		},
		{
			cat: "Method",
			title: "Where structured data sits in AI retrieval",
			excerpt:
				"Does schema markup still matter, and at which step of the pipeline?",
			meta: "Sample · 2026.07.18",
			href: "/blog/",
		},
		{
			cat: "Platforms",
			title:
				"The localisation trap: Chinese content is not understood by default",
			excerpt:
				"Three common content mismatches for exporters, and the cheapest order to fix them.",
			meta: "Sample · 2026.07.09",
			href: "/blog/",
		},
	],
	nav: [
		{ label: "Home", href: "/", target: "_self" },
		{ label: "Services", href: "/#service-tiers", target: "_self" },
		{ label: "Cases", href: "/case-studies/", target: "_self" },
		{ label: "About", href: "/#about", target: "_self" },
		{ label: "Monitor ↗", href: TOOL_URL, target: "_blank" },
	],
};
