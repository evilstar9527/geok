export type BlogPost = {
	slug: string;
	title: string;
	description: string;
	/** ISO date. Emitted as dateModified and shown as 最后更新 on the page (GEO 原则 9). */
	updated: string;
	keywords: string[];
};

export const BLOG_POSTS: BlogPost[] = [
	{
		slug: "what-is-geo",
		title: "什么是 GEO（生成式引擎优化）？与 SEO、AEO 的区别",
		description:
			"GEO 是让内容被 AI 生成回答引用、总结或推荐的优化方法。本文给出 GEO 的定义、学术出处、与 SEO 和 AEO 的逐项对比，以及经过验证的 9 项 GEO 原则。",
		updated: "2026-09-12",
		keywords: [
			"什么是 GEO",
			"生成式引擎优化",
			"GEO 和 SEO 区别",
			"GEO AEO 区别",
			"AI 搜索优化",
		],
	},
	{
		slug: "geo-tools-comparison",
		title: "GEO 工具怎么选？6 款 AI 可见度监测工具对比",
		description:
			"从渠道覆盖、抓取方式、数据归属、部署方式和定价 8 个维度，对比 GEOK、Semrush AI Visibility、Profound、Peec AI、Otterly、Simular 六款 GEO 工具，并说明国产大模型覆盖为什么是选型的关键分水岭。",
		updated: "2026-09-12",
		keywords: [
			"GEO 工具",
			"AI 可见度工具对比",
			"GEO 工具选型",
			"AI visibility 工具",
			"豆包 可见度 工具",
		],
	},
	{
		slug: "doubao-brand-visibility",
		title: "怎么查品牌在豆包、DeepSeek 里被怎么描述？",
		description:
			"国产大模型的品牌引用无法通过模型 API 获取。本文给出在豆包、DeepSeek、Kimi、元宝、千问、点点中检查品牌可见度的完整方法、可复用的提示词清单，以及如何量化和持续追踪。",
		updated: "2026-09-12",
		keywords: [
			"豆包 品牌监测",
			"品牌在豆包里的排名",
			"DeepSeek 品牌可见度",
			"国产大模型 GEO",
			"AI 回答 品牌提及",
		],
	},
	{
		slug: "self-hosted-geo-tools",
		title: "GEO 工具能自托管吗？数据归属与部署方式对比",
		description:
			"品牌在 AI 回答中的可见度数据是敏感的经营数据。本文说明 SaaS 型 GEO 工具的数据归属风险、自托管的取舍，以及用 Docker 自建 AI 可见度追踪栈的完整路径。",
		updated: "2026-09-12",
		keywords: [
			"GEO 工具 自托管",
			"AI 可见度 私有化部署",
			"self-hosted GEO",
			"开源 GEO 工具",
			"AI 监测 数据安全",
		],
	},
	{
		slug: "ai-visibility-methodology",
		title: "AI 可见度怎么量化？一套可复现的 GEO 评分方法",
		description:
			"把“品牌在 AI 回答里表现如何”变成可比较、可复现的数字：可见度、绝对排名、情感倾向、推荐类型四个指标的定义、计分规则与常见误用，以及如何保证跨模型、跨时间的结果可比。",
		updated: "2026-09-12",
		keywords: [
			"AI 可见度 指标",
			"GEO 评分 方法",
			"AI 品牌提及 量化",
			"share of AI voice",
			"GEO 效果衡量",
		],
	},
];

export const getPost = (slug: string): BlogPost | undefined =>
	BLOG_POSTS.find((post) => post.slug === slug);
