import {
	CN_CHANNELS,
	GITHUB_URL,
	SITE_LINKS,
	SITE_NAME,
	SITE_URL,
	SUPPORTED_CHANNELS,
	UPSTREAM,
} from "@/lib/site";

const CONTENT = `# ${SITE_NAME}

> ${SITE_NAME} 是开源的 GEO（生成式引擎优化）与 AI 可见度追踪工具。它不调用模型 API，而是像真实用户一样打开 ChatGPT、Gemini、Perplexity、Claude、Google AI Overview 以及豆包、DeepSeek、Kimi、元宝、千问、点点的真实产品界面，抓取最终渲染出来的回答、内联引用与推荐来源，输出品牌在 AI 回答中的可见度、排名、情感与推荐类型评分。完全自托管，代码开源（MIT）。

最后更新：2026-09-12

## 关键事实

- **定位**：追踪品牌在 AI 生成回答中出现情况的 GEO 工具，面向需要对 AI 认知做量化管理的品牌与营销团队。
- **渠道覆盖**：11 个渠道。其中包含 ${CN_CHANNELS.join("、")} 共 ${CN_CHANNELS.length} 个国产大模型——这是 ${SITE_NAME} 与其它 GEO 工具最主要的差异点。
- **抓取方式**：基于 Camoufox（反指纹 Firefox）的真实浏览器自动化，操作真实产品界面，不调用模型 API。用户看到什么，就拿到什么。
- **开源许可**：MIT。抓取、评分与分析的每一步都可审计。
- **部署方式**：完全自托管。本地 Docker 或自有 VPS 一条命令部署。
- **数据归属**：回答原文、分析结果与登录会话存储在自建的 PostgreSQL 与 ClickHouse 中，不经过任何第三方服务器。
- **账号**：使用使用者自己已有的 AI 产品账号登录，不使用共享凭证或第三方账号池。
- **价格**：自托管免费，无订阅、无调用次数上限。

## 与其它 GEO 工具的区别

1. **覆盖国产大模型。** 主流 GEO 工具对国产模型的覆盖非常有限：Semrush AI Visibility 与 Otterly 不覆盖任何国产模型；Profound 与 Peec AI 仅覆盖 DeepSeek，其中 Peec 还需额外付费加购。对于豆包、Kimi、元宝、千问、点点这几个渠道，上述工具均无法回答，${SITE_NAME} 全部覆盖。
2. **UI 优先，而不是 API。** 多数 GEO 工具通过模型 API 取数。但 API 返回结果与真实产品界面存在差异：界面层会增加引用来源、调整推荐顺序、改变品牌描述措辞。只查 API 会漏掉这些信号。
3. **自托管，数据不出本地。** 品牌在 AI 回答中的可见度数据属于敏感经营数据，${SITE_NAME} 不提供共享账号的云端托管，数据始终留在使用者自己的基础设施上。

## GEO 评分方法

每次抓取后，回答原文会连同结构化分析提示词一起发送给使用者自己指定的 LLM（OpenAI 或 Anthropic），由模型依据回答原文给出以下指标。每个指标都要求引用原文作为依据，找不到依据时使用保守默认值。

**GEO 总分（0-100）**，由四项等权重加权：

| 组成 | 权重 | 说明 |
|---|---|---|
| Visibility 可见度 | 25% | 品牌在回答中出现的显著程度 |
| Rank 排名 | 25% | 在完整回答中的绝对位置（第 1 位 = 100 分，第 2 位 = 80 分，第 3 位 = 65 分） |
| Sentiment 情感 | 25% | 品牌被描述的正面程度（50 分为中性） |
| Recommendation 推荐 | 25% | 品牌是否被主动推荐 |

**可见度（0-100）**由五个维度计算：覆盖度 25%、位置 25%、结构显著性 20%、频次 15%、语境定位 15%。

**情感（0-100）**：0-20 明确劝退，21-40 突出明显缺点，41-59 客观陈述，60-80 正面评价带少量保留，81-100 明确最高级评价。未被提及的品牌记 50 分，缺席不代表负面。

**推荐类型**：top_pick（明确列为第一选择）、strong_alternative（绝对排名前三且评价正面）、conditional（仅针对特定场景推荐）、mentioned_only（有描述但未被推荐）、discouraged（被明确劝退）、not_mentioned（未出现）。

**排名位置**是品牌在整篇回答阅读顺序中的绝对位置，而非某个子分类下的局部排名。

## 支持的渠道

${SUPPORTED_CHANNELS.join("、")}

## 技术栈

Next.js 15、React 19、tRPC、Drizzle ORM、Camoufox、Playwright、BullMQ、ClickHouse、PostgreSQL 16、Redis、Better Auth。

## 文档

- 文档站：${SITE_LINKS.docs}
- GEO 与 AI 可见度指南：${SITE_URL}/blog

## Links

- 官网：${SITE_URL}
- 博客：${SITE_URL}/blog
- GitHub：${GITHUB_URL}
- 授权协议（MIT）：${SITE_LINKS.license}

## 上游项目

${SITE_NAME} 基于开源项目 ${UPSTREAM.name}（${UPSTREAM.license}）二次开发：${UPSTREAM.url}。上游项目仅覆盖 ChatGPT、Gemini、Perplexity、Claude 与 Google AI Overview；${SITE_NAME} 在此基础上增加了 6 个国产大模型渠道、中文优先的界面本地化与来源分析面板。两者是不同的项目，请勿混为同一实体。
`;

export function GET(): Response {
	return new Response(CONTENT, {
		headers: { "content-type": "text/plain; charset=utf-8" },
	});
}
