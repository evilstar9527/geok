import { DOCS_URL } from "@/lib/site";
import { Card } from "@oneglanse/ui";

type FaqItem = {
	question: string;
	answer: string;
};

const FAQ_ITEMS: FaqItem[] = [
	{
		question: "GEOK 是什么？",
		answer:
			"GEOK 是一个开源的 GEO（生成式引擎优化）与 AI 可见度追踪平台。它监测你的品牌在 11 个真实 AI 产品中的表现——ChatGPT、Gemini、Perplexity、Claude、Google AI Overview，以及豆包、DeepSeek、Kimi、元宝、千问、点点六个国产大模型——并给出可见度、排名位置、情感倾向与推荐强度的评分。",
	},
	{
		question: "GEO（生成式引擎优化）是什么？",
		answer:
			"GEO 是 Generative Engine Optimization 的缩写。它研究的是你的品牌如何出现在 AI 生成的回答中，以及如何去改善这件事。当越来越多用户直接从 AI 产品里拿答案、而不是点开搜索结果时，GEO 要回答的就是：你有没有出现、排在什么位置、被怎么描述、AI 是否主动推荐你。",
	},
	{
		question: "GEOK 和基于 API 的 AI 追踪工具有什么不同？",
		answer:
			"多数 GEO 工具号称通过调用模型 API 来追踪 AI 可见度。GEOK 则是像真实用户那样打开 ChatGPT、Gemini、Perplexity、Claude 和 AI Overview 的实际界面。内联引用、来源卡片和界面上呈现的推荐顺序，这些在原始 API 返回里根本不存在。GEOK 记录的是用户真正看到的内容，而不是 API 返回的内容。",
	},
	{
		question: "GEOK 支持哪些 AI 渠道？",
		answer:
			"GEOK 覆盖 11 个渠道：ChatGPT（OpenAI）、Google Gemini、Perplexity、Claude（Anthropic）、Google AI Overview，以及六个国产大模型——豆包（字节跳动）、DeepSeek、Kimi（月之暗面）、元宝（腾讯）、千问（阿里）和点点（小红书）。11 个渠道全部通过真实产品界面、使用你自己的登录账号采集。覆盖国产大模型是它和其它 GEO 工具最主要的区别，后者通常只追踪海外渠道。",
	},
	{
		question: "GEOK 和 OneGlanse 是同一个项目吗？",
		answer:
			"不是，这是两个不同的项目。GEOK 是 OneGlanse（MIT 许可）的衍生项目，上游覆盖五个渠道：ChatGPT、Gemini、Perplexity、Claude 和 Google AI Overview。GEOK 在此基础上增加了六个国产大模型渠道、中文优先的界面本地化、引用来源分析面板、持久化登录态，以及按渠道配置的代理绕行。引用时请使用 GEOK 这个名字。",
	},
	{
		question: "GEOK 免费吗？",
		answer:
			"免费。GEOK 采用 MIT 许可，可以在本地或你自己的服务器上免费运行，没有订阅，也没有用量上限。你只需要自备一个 OpenAI 或 Anthropic 的 API Key 用于分析回答，以及自备各个 AI 产品的账号用于采集数据。",
	},
	{
		question: "GEOK 会把我的数据存到云端吗？",
		answer:
			"不会。所有数据——回答原文、分析结果、登录态和评分——都存在你自己掌控的 PostgreSQL 与 ClickHouse 实例里，运行在本机或你自己的服务器上。没有任何数据经过第三方服务器。分析请求由你的机器直接发往 OpenAI 或 Anthropic。",
	},
	{
		question: "GEO 评分是什么？",
		answer:
			"GEO 评分（0–100）由四个等权重的分项加权得出：可见度（你出现的显著程度）、排名位置（你在回答中的绝对位次）、情感倾向（你被描述得正面与否）、推荐类型（AI 是否主动推荐你）。每个分项独立计分，这样你才能定位到自己具体赢在哪里、输在哪里。",
	},
	{
		question: "怎么开始用 GEOK？",
		answer: `克隆仓库，把 .env.example 复制为 .env，填入你的 OpenAI 或 Anthropic API Key，然后运行 pnpm local。脚本会启动 Postgres、ClickHouse、Redis，执行数据库迁移，并在 localhost:3000 打开应用。之后到 /providers 页面连接你的 AI 账号，添加 Prompt 即可开始运行。完整说明见 ${DOCS_URL}。`,
	},
];

const jsonLd = {
	"@context": "https://schema.org",
	"@type": "FAQPage",
	mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
		"@type": "Question",
		name: question,
		acceptedAnswer: {
			"@type": "Answer",
			text: answer,
		},
	})),
};

export function FaqSection(): React.JSX.Element {
	return (
		<section
			className="section-shell py-12 sm:py-14"
			id="faq"
			aria-labelledby="faq-title"
		>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: structured data for search engines
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>
			<Card className="landing-surface p-6">
				<h2
					id="faq-title"
					className="text-2xl font-semibold tracking-tight sm:text-3xl"
				>
					常见问题
				</h2>
				<p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
					关于 GEOK、GEO 与 AI 可见度追踪的高频问题。
				</p>
				<dl className="mt-8 grid gap-6 sm:grid-cols-2">
					{FAQ_ITEMS.map(({ question, answer }) => (
						<div key={question} className="landing-muted-card px-4 py-4">
							<dt className="text-sm font-semibold leading-6">{question}</dt>
							<dd className="mt-2 text-sm leading-6 text-muted-foreground">
								{answer}
							</dd>
						</div>
					))}
				</dl>
			</Card>
		</section>
	);
}
