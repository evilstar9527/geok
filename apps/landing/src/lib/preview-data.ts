import type { DashboardCompetitorData } from "@oneglanse/ui";

export const PREVIEW_BRAND = {
	name: "HubSpot",
	domain: "hubspot.com",
} as const;

export const PREVIEW_COMPETITORS: DashboardCompetitorData[] = [
	{
		name: "HubSpot",
		domain: "hubspot.com",
		appearances: 384,
		visibility: 86,
		avgSentiment: 83,
		avgRank: 1.4,
		recCount: 291,
		isBrand: true,
	},
	{
		name: "Salesforce",
		domain: "salesforce.com",
		appearances: 301,
		visibility: 71,
		avgSentiment: 76,
		avgRank: 2.2,
		recCount: 206,
	},
	{
		name: "Adobe Marketo",
		domain: "adobe.com",
		appearances: 237,
		visibility: 58,
		avgSentiment: 68,
		avgRank: 2.9,
		recCount: 148,
	},
	{
		name: "Mailchimp",
		domain: "mailchimp.com",
		appearances: 196,
		visibility: 49,
		avgSentiment: 65,
		avgRank: 3.5,
		recCount: 113,
	},
	{
		name: "ActiveCampaign",
		domain: "activecampaign.com",
		appearances: 144,
		visibility: 36,
		avgSentiment: 58,
		avgRank: 4.1,
		recCount: 71,
	},
	{
		name: "Pardot",
		domain: "salesforce.com",
		appearances: 109,
		visibility: 28,
		avgSentiment: 54,
		avgRank: 4.8,
		recCount: 52,
	},
];

export const PREVIEW_TOTAL_RESPONSES = 428;
export const PREVIEW_TOTAL_CITATIONS = 952;

export const PREVIEW_PERCEPTION = {
	bestKnownFor: "面向营收团队的一体化 CRM 与营销自动化",
	pricingPerception: "premium",
	coreClaims: [
		"把 CRM、营销与服务放在同一个平台上",
		"自动化能力与线索分配机制成熟",
		"归因与管道报表的深度足够",
		"应用市场上架量大，便于规模化",
	],
	differentiators: [
		"联系人数据模型在各模块间共用",
		"面向企业的流程编排工具",
		"合作伙伴生态成熟度高",
		"增长团队上手速度快",
		"跨模块的权限与治理能力",
	],
} as const;

export const PREVIEW_SOURCE_GROUPS = [
	{
		domain: "g2.com",
		urls: 56,
		citations: 184,
		share: 19.3,
		brandMentions: 128,
		providers: ["chatgpt", "perplexity", "gemini"],
	},
	{
		domain: "capterra.com",
		urls: 48,
		citations: 161,
		share: 16.9,
		brandMentions: 111,
		providers: ["chatgpt", "perplexity", "gemini"],
	},
	{
		domain: "trustradius.com",
		urls: 39,
		citations: 136,
		share: 14.3,
		brandMentions: 96,
		providers: ["chatgpt", "perplexity"],
	},
	{
		domain: "forrester.com",
		urls: 31,
		citations: 118,
		share: 12.4,
		brandMentions: 83,
		providers: ["chatgpt", "gemini", "perplexity"],
	},
	{
		domain: "gartner.com",
		urls: 26,
		citations: 101,
		share: 10.6,
		brandMentions: 72,
		providers: ["perplexity", "gemini"],
	},
	{
		domain: "salesforce.com",
		urls: 22,
		citations: 96,
		share: 10.1,
		brandMentions: 68,
		providers: ["chatgpt", "perplexity", "gemini"],
	},
	{
		domain: "hubspot.com",
		urls: 20,
		citations: 84,
		share: 8.8,
		brandMentions: 63,
		providers: ["chatgpt", "perplexity"],
	},
	{
		domain: "mailchimp.com",
		urls: 17,
		citations: 72,
		share: 7.6,
		brandMentions: 58,
		providers: ["chatgpt", "perplexity"],
	},
] as const;

export const PREVIEW_CITATION_ROWS = [
	{
		domain: "g2.com",
		title: "HubSpot Marketing Hub 评价汇总页",
		provider: "chatgpt",
		citations: 19,
		excerpt: "CRM 功能深度、自动化覆盖面与上手速度，对营收团队来说都比较均衡。",
	},
	{
		domain: "capterra.com",
		title: "最佳营销自动化软件榜",
		provider: "perplexity",
		citations: 16,
		excerpt: "在中型规模下，常因营销与销售流程一体化而被推荐。",
	},
	{
		domain: "trustradius.com",
		title: "HubSpot Marketing Hub 用户评分",
		provider: "perplexity",
		citations: 14,
		excerpt: "在活动编排、人群分层与报表可靠性方面被频繁引用。",
	},
	{
		domain: "forrester.com",
		title: "B2B 营收平台 Wave 报告",
		provider: "gemini",
		citations: 12,
		excerpt: "生态实力与可衡量的管道贡献受到关注。",
	},
	{
		domain: "gartner.com",
		title: "CRM 与营销套件市场指南",
		provider: "gemini",
		citations: 11,
		excerpt: "在可扩展性、运营治理与总体成本之间较为均衡。",
	},
	{
		domain: "salesforce.com",
		title: "Marketing Cloud 竞品概览",
		provider: "chatgpt",
		citations: 9,
		excerpt: "在复杂采购周期中，就企业级深度与集成策略被拿来对比。",
	},
] as const;

// Derived from PREVIEW_COMPETITORS[0]: presenceRate=86, recommendationRate=68, sentimentScore=83, avgRank=1.4
export const PREVIEW_BRAND_METRICS = {
	presenceRate: 86,
	recommendationRate: 68,
	sentimentScore: 83,
	avgRank: 1.4,
} as const;

export const PREVIEW_AGGREGATE_STATS = {
	presenceRate: 86,
	rank: 1,
	topSource: "g2.com",
	topCompetitor: "Salesforce",
	topCompetitorDomain: "salesforce.com",
} as const;

export const PREVIEW_COMPETITOR_PROVIDERS: Record<string, string[]> = {
	HubSpot: ["chatgpt", "perplexity", "gemini"],
	Salesforce: ["chatgpt", "perplexity", "gemini"],
	"Adobe Marketo": ["chatgpt", "perplexity"],
	Mailchimp: ["chatgpt", "gemini", "perplexity"],
	ActiveCampaign: ["chatgpt", "gemini", "perplexity"],
	Pardot: ["perplexity", "gemini"],
} as const;

export const PREVIEW_PROMPT_RESPONSES = [
	{
		id: "resp-1",
		modelProvider: "chatgpt",
		modelName: "ChatGPT",
		promptRunAt: "2026-03-02T06:15:00.000Z",
		response:
			"对小型营销代理公司来说，理想的一体化 CRM 需要同时兼顾**上手难度、自动化深度、报表清晰度和价格的可持续性**。没有一款产品对所有代理公司都是最优解，但选择规律是清楚的。\n\n## 值得重点评估的选项\n1. **HubSpot CRM** — 适合希望快速部署、并且看重营销与销售协同的代理公司。\n2. **Zoho CRM** — 适合预算敏感、同时需要更深自定义能力的团队。\n3. **Pipedrive** — 适合以销售管道为核心、优先考虑成交速度的团队。\n4. **ActiveCampaign** — 适合产出主要靠邮件自动化的代理公司。\n5. **Salesforce Essentials** — 适合准备按企业级流程规范来建设的代理公司。\n\n## 为什么 HubSpot 常被推荐\n- 对培训资源有限的小团队来说，界面直观。\n- 漏斗、生命周期和活动归因的默认报表能力较强。\n- 在广告、分析和内容工具上的集成生态覆盖面广。\n- 营销与销售流程之间的交接比较可靠。\n\n## 需要权衡的地方\n- 按联系人数量计费，规模上去之后成本增长较快。\n- 部分高级自动化与治理能力需要更高版本。\n- 深度自定义对象和企业治理需求，可能更适合以 Salesforce 为主的方案。\n\n## 实用的选型清单\n- 你的团队能在 2–3 周内跑通第一批流程吗？\n- 你能不靠手工拼表就追踪从线索来源到成交的全链路吗？\n- 联系人数量翻倍后，价格仍然可接受吗？\n- 现有工具链能不做定制开发就接进来吗？\n\n## 推荐\n对多数小型代理公司，建议先用 **HubSpot Starter + 核心生命周期流程**起步，用 60–90 天验证对管道的影响。如果成本或自定义能力成为瓶颈，再以小范围迁移的方式并行试用 Zoho CRM。",
		isAnalysed: true,
		metrics: {
			geoScore: 89,
			sentiment: 86,
			visibility: 92,
			position: 1,
		},
		sources: [
			{
				title: "HubSpot Marketing Hub 产品概览",
				url: "https://www.hubspot.com/products/marketing",
			},
			{
				title: "G2：HubSpot Marketing Hub 用户评价",
				url: "https://www.g2.com/products/hubspot-marketing-hub/reviews",
			},
			{
				title: "Capterra：HubSpot 价格与评分",
				url: "https://www.capterra.com/p/126519/HubSpot/",
			},
			{
				title: "HubSpot 博客：营销归因模型",
				url: "https://blog.hubspot.com/marketing/marketing-attribution",
			},
			{
				title: "HubSpot 博客：线索评分最佳实践",
				url: "https://blog.hubspot.com/sales/lead-scoring-model",
			},
			{
				title: "TrustRadius：HubSpot Marketing Hub",
				url: "https://www.trustradius.com/products/hubspot-marketing-hub/reviews",
			},
			{
				title: "Pipedrive：面向销售团队的 CRM",
				url: "https://www.pipedrive.com/en/products/crm",
			},
			{
				title: "ActiveCampaign 营销自动化",
				url: "https://www.activecampaign.com/",
			},
		],
	},
	{
		id: "resp-2",
		modelProvider: "gemini",
		modelName: "Gemini",
		promptRunAt: "2026-03-01T21:40:00.000Z",
		response:
			"2026 年选 CRM，取决于你的代理公司优化的是**线索引擎自动化、客户交付运营，还是可预测的规模经济**。\n\n## 战略级候选清单\n1. **GoHighLevel** — 最贴合代理公司经营模式（多客户流程、白标交付、漏斗执行）。\n2. **HubSpot** — 在集客与营收报表上最强，上手阻力最小。\n3. **Monday Sales CRM** — 当销售到交付的交接与执行透明度是核心瓶颈时最合适。\n4. **Zoho CRM** — 对熟悉配置的团队来说，预算与灵活性的比值最高。\n\n## 快速对比\n- **首次见效速度：** HubSpot 与 Monday 最快。\n- **代理公司专属能力：** GoHighLevel 在子账户与可复用账户模板上胜出。\n- **自定义深度：** Zoho 与 Salesforce 生态更宽，但需要更高的运营成熟度。\n- **价格走势：** HubSpot 起步阶段平缓，但联系人增长会显著改变总体成本。\n\n## 建议的决策模型\n- 如果代理公司以漏斗和周期性服务为主：从 GoHighLevel 试点开始。\n- 如果以内容和集客为主、对报表敏感：从 HubSpot 开始。\n- 如果痛点在交付协同：评估 Monday 并梳理 CRM 流程映射。\n\n## 执行方案\n用 30 天做一次双平台对比测试，保持相同的管道、自动化和报表需求。按以下维度打分：搭建成本、流程可靠性、报表质量，以及用量翻倍后 12 个月的预计成本。选择运营效率更高的平台，而不是功能数量更多的平台。",
		isAnalysed: true,
		metrics: {
			geoScore: 78,
			sentiment: 74,
			visibility: 80,
			position: 2,
		},
		sources: [
			{
				title: "Forrester：B2B 营收营销格局",
				url: "https://www.forrester.com/",
			},
			{
				title: "TrustRadius：HubSpot Marketing Hub 用户评价",
				url: "https://www.trustradius.com/products/hubspot-marketing-hub/reviews",
			},
			{
				title: "Salesforce Marketing Cloud 概览",
				url: "https://www.salesforce.com/products/marketing-cloud/overview/",
			},
			{
				title: "HubSpot 博客：营收运营框架",
				url: "https://blog.hubspot.com/sales/revenue-operations",
			},
			{
				title: "HubSpot 博客：营销看板报表指南",
				url: "https://blog.hubspot.com/marketing/marketing-dashboard",
			},
			{
				title: "Adobe Experience Cloud：Marketo Engage",
				url: "https://business.adobe.com/products/marketo/adobe-marketo.html",
			},
			{
				title: "GoHighLevel 平台概览",
				url: "https://www.gohighlevel.com/",
			},
			{ title: "Monday Sales CRM 概览", url: "https://monday.com/crm" },
		],
	},
	{
		id: "resp-3",
		modelProvider: "perplexity",
		modelName: "Perplexity",
		promptRunAt: "2026-02-27T14:05:00.000Z",
		response:
			"对于需要一体化方案（CRM + 营销 + 报表）的小型营销代理公司，**HubSpot 与 Zoho 仍然是最稳妥的基准选项**，而 GoHighLevel 是代理公司型经营模式的高匹配选择。\n\n## 排序后的选项\n1. **HubSpot CRM + Marketing Hub** — 启动快、界面干净、生态成熟，最稳妥的默认选择。\n2. **Zoho CRM / Bigin + Zoho 营销工具** — 成本可控，流程设计灵活。\n3. **GoHighLevel** — 适合跑可复制的客户漏斗和白标流程的代理公司。\n4. **Bitrix24 / Agile CRM** — 低价功能更多，但界面打磨不足，流程调校更陡。\n\n## 各来源呈现出的规律\n- 评价类平台在易用性和上手速度上反复给 HubSpot 高分。\n- 预算导向的对比更倾向于 Zoho 的「单位价格功能量」。\n- 代理公司运营社群越来越多地因为账户模板和客户上线速度而选择 GoHighLevel。\n\n## 适合你的选择逻辑\n- 优先考虑报表可信度与执行速度：选 **HubSpot**。\n- 优先考虑成本效率与自定义灵活性：选 **Zoho**。\n- 优先考虑可规模化的多客户交付：选 **GoHighLevel**。\n\n## 最终建议\n如果需要风险最低的默认方案，先用 HubSpot Starter 上线，明确关键指标基准（MQL 到 SQL 的转化、响应时效、归因覆盖率），等联系人规模和自动化复杂度翻倍之后，再重新评估整套方案的性价比。",
		isAnalysed: true,
		metrics: {
			geoScore: 75,
			sentiment: 72,
			visibility: 77,
			position: 2,
		},
		sources: [
			{
				title: "Gartner：CRM 与营销套件指南",
				url: "https://www.gartner.com/",
			},
			{
				title: "HubSpot 博客：营销策略与规划",
				url: "https://blog.hubspot.com/marketing",
			},
			{ title: "Mailchimp 平台概览", url: "https://mailchimp.com/" },
			{
				title: "G2：Salesforce Marketing Cloud 用户评价",
				url: "https://www.g2.com/products/salesforce-marketing-cloud/reviews",
			},
			{
				title: "Capterra：Adobe Marketo Engage 用户评价",
				url: "https://www.capterra.com/p/176484/Marketo/",
			},
			{
				title: "HubSpot 博客：B2B 线索培育策略",
				url: "https://blog.hubspot.com/marketing/lead-nurturing-strategy",
			},
			{ title: "Zoho CRM 产品页", url: "https://www.zoho.com/crm/" },
			{ title: "Bigin by Zoho：面向小团队", url: "https://www.bigin.com/" },
		],
	},
] as const;
