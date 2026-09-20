import { TOOL_URL } from "../lib/paths.mjs";

export const CN = {
	langLabel: "EN",
	cta: "申请免费诊断",
	liteCta: "了解轻量版",
	kicker: "CASE STUDIES",
	title: "客户案例",
	lead: "三个不同行业、不同起点的项目记录。以下为示例占位内容，正式上线前将替换为经客户授权的真实数据。",
	labelProblem: "PROBLEM",
	labelAction: "ACTION",
	labelResult: "RESULT",
	disclaimer:
		"示例：以上案例数据与证言为占位内容，不代表真实客户或已实现的效果。",
	endTitle: "想知道你的行业问题里，AI 会怎么回答？",
	endBody: "留下联系方式，我们用你所在行业的真实提问跑一遍，出具免费诊断。",
	copy: "© 2026 见客 JianKe. All rights reserved.",
	icp: "京ICP备00000000号",
	cases: [
		{
			tag: "示例 · 工业制造",
			tier: "标准版 · 6 个月",
			title: "从「AI 完全不提」到稳定进入国产供应商推荐名单",
			problem:
				"客户在采购决策前会先问 AI「有哪些国产供应商可以考虑」，而该企业在四个主流平台上的提及率为零。官网内容以产品参数为主，缺少可被模型引用的结论性表述。",
			actions: [
				"建立 60 组采购场景问题库，按季度追踪",
				"重构官网产品页与 FAQ，补齐资质、产能、交付周期等事实信息",
				"在行业媒体与目录站建立一致的品牌事实描述",
			],
			metrics: [
				{ v: "0 → 5", k: "主流平台平均推荐位次" },
				{ v: "68%", k: "六个月后提及率" },
				{ v: "3.2×", k: "官网询盘量" },
			],
			quote:
				"最难的不是做内容，是知道该做哪些内容。监测数据把这件事变成了一份清单。",
			who: "市场负责人 · A 集团（示例）",
		},
		{
			tag: "示例 · SaaS",
			tier: "标准版 · 4 个月",
			title: "在竞品对比类问题中，把自己的优势讲清楚",
			problem:
				"AI 在回答「A 和 B 哪个更好」时，反复引用一篇三年前的第三方评测，其中的功能描述已经过时，导致模型持续输出错误结论。",
			actions: [
				"定位模型高频引用的 12 个信源并逐一梳理",
				"发布结构化的功能对比与更新日志页面",
				"针对过时评测补充公开的更新说明",
			],
			metrics: [
				{ v: "12 → 2", k: "过时信息出现次数/月" },
				{ v: "+41%", k: "对比类问题胜出率" },
				{ v: "4 周", k: "首次口径纠正生效" },
			],
			quote: "报告里最有价值的是那份内容整改清单，我们内容团队照着做就行。",
			who: "增长负责人 · C 科技（示例）",
		},
		{
			tag: "示例 · 跨境电商",
			tier: "旗舰版 · 8 个月",
			title: "海外平台从零覆盖到可持续监测",
			problem:
				"品牌在国内平台表现尚可，但在 ChatGPT、Perplexity 等海外平台几乎不可见。英文内容为机器翻译，事实口径与中文站不一致。",
			actions: [
				"建立中英双语问题库，分市场独立监测",
				"重写英文站核心页面，统一中英事实口径",
				"在海外问答社区与行业目录建设本地信源",
			],
			metrics: [
				{ v: "0 → 34%", k: "海外平台提及率" },
				{ v: "6 → 14", k: "被引用信源数" },
				{ v: "+2.1×", k: "海外站自然访问" },
			],
			quote:
				"海外平台的表现我们原本完全看不见，现在每周能看到变化，投放也知道该补哪块内容。",
			who: "品牌总监 · F 电商（示例）",
		},
	],
	nav: [
		{ label: "首页", href: "/", target: "_self" },
		{ label: "服务方案", href: "/#service-tiers", target: "_self" },
		{ label: "轻量版", href: "/services-lite/", target: "_self" },
		{ label: "博客", href: "/blog/", target: "_self" },
		{ label: "监测平台 ↗", href: TOOL_URL, target: "_blank" },
	],
};

export const EN = {
	langLabel: "中文",
	cta: "Request a free audit",
	liteCta: "See the Lite tier",
	kicker: "CASE STUDIES",
	title: "Client cases",
	lead: "Three projects across different industries and starting points. Content below is placeholder and will be replaced with approved client data before launch.",
	labelProblem: "PROBLEM",
	labelAction: "ACTION",
	labelResult: "RESULT",
	disclaimer:
		"Sample: figures and quotes are placeholders and do not represent real clients or achieved results.",
	endTitle: "Curious how AI answers the questions in your category?",
	endBody:
		"Leave your details and we'll run your industry's real questions and return a free audit.",
	copy: "© 2026 JianKe. All rights reserved.",
	icp: "ICP No. 00000000",
	cases: [
		{
			tag: "Sample · Manufacturing",
			tier: "Standard · 6 months",
			title: "From invisible to a fixed place on the supplier shortlist",
			problem:
				"Buyers asked AI which domestic suppliers to consider, and this company had a zero mention rate on four major platforms. Its site was all product specs with no citable conclusions.",
			actions: [
				"Built a 60-prompt procurement question set, tracked quarterly",
				"Rebuilt product pages and FAQs with certifications, capacity and lead times",
				"Aligned brand facts across trade media and directory listings",
			],
			metrics: [
				{ v: "0 → 5", k: "Avg. recommendation position" },
				{ v: "68%", k: "Mention rate at 6 months" },
				{ v: "3.2×", k: "Inbound enquiries" },
			],
			quote:
				"The hard part was never producing content — it was knowing which content. The data turned that into a checklist.",
			who: "Head of Marketing · Group A (sample)",
		},
		{
			tag: "Sample · SaaS",
			tier: "Standard · 4 months",
			title: "Getting the advantages right in head-to-head comparisons",
			problem:
				"Answering \u201cA or B?\u201d, models kept citing a three-year-old third-party review whose feature descriptions were long out of date.",
			actions: [
				"Identified and reviewed the 12 sources models cited most",
				"Published a structured comparison page and changelog",
				"Added public update notes addressing the outdated review",
			],
			metrics: [
				{ v: "12 → 2", k: "Outdated claims per month" },
				{ v: "+41%", k: "Win rate in comparisons" },
				{ v: "4 weeks", k: "To first correction" },
			],
			quote:
				"The valuable part was the content fix list our team could just work through.",
			who: "Head of Growth · C Tech (sample)",
		},
		{
			tag: "Sample · Cross-border",
			tier: "Flagship · 8 months",
			title: "From zero global coverage to sustained monitoring",
			problem:
				"The brand performed acceptably on Chinese platforms but was near-invisible on ChatGPT and Perplexity. English content was machine-translated and inconsistent with the Chinese site.",
			actions: [
				"Built a bilingual prompt set monitored per market",
				"Rewrote core English pages and aligned facts across languages",
				"Built local sources in overseas Q&A communities and directories",
			],
			metrics: [
				{ v: "0 → 34%", k: "Mention rate, global" },
				{ v: "6 → 14", k: "Cited sources" },
				{ v: "+2.1×", k: "Organic visits, EN site" },
			],
			quote:
				"We had zero view of overseas platforms. Now we see weekly movement and know which content to fill.",
			who: "Brand Director · F (sample)",
		},
	],
	nav: [
		{ label: "Home", href: "/", target: "_self" },
		{ label: "Services", href: "/#service-tiers", target: "_self" },
		{ label: "Lite", href: "/services-lite/", target: "_self" },
		{ label: "Blog", href: "/blog/", target: "_self" },
		{ label: "Monitor ↗", href: TOOL_URL, target: "_blank" },
	],
};
