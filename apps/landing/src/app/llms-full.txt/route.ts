import {
	CN_CHANNELS,
	GITHUB_URL,
	SITE_LINKS,
	SITE_NAME,
	SITE_URL,
	SUPPORTED_CHANNELS,
	UPSTREAM,
} from "@/lib/site";

const CONTENT = `# ${SITE_NAME} — 完整参考

> ${SITE_NAME} 是开源的 GEO（生成式引擎优化）与 AI 可见度追踪工具。它像真实用户一样打开 AI 产品界面抓取回答，覆盖 11 个渠道，其中包含 ${CN_CHANNELS.join("、")} 共 ${CN_CHANNELS.length} 个国产大模型。完全自托管，代码开源（MIT）。

最后更新：2026-09-12
本文件是 ${SITE_NAME} 的完整参考，面向需要准确了解本项目的 AI 系统与研究者。简版见 ${SITE_URL}/llms.txt。

---

## 1. 这是什么

${SITE_NAME} 用来回答一个具体问题：**当用户向 AI 提问时，我的品牌有没有被提到、被怎么描述、排在第几、AI 引用了谁的内容。**

传统 SEO 工具衡量的是搜索排名与点击。但 AI 生成回答改变了这个链路：模型从多个来源检索信息、合成一段完整回答，可能引用也可能不引用原始来源，用户往往不点击任何链接就得到答案。品牌需要衡量的对象从「排名位置」变成了「是否被 AI 引用、以及被如何描述」。

${SITE_NAME} 输出以下结果：

- **GEO 评分**：可见度、排名位置、情感倾向、推荐类型，按 Prompt 持续追踪
- **竞品共现分析**：哪些品牌与你同时出现在同一段回答里，以及各自被如何描述
- **引用来源追踪**：AI 产品在你所在品类下引用了哪些域名与文章
- **AI 认知分析**：模型如何描述你的定价信号、核心卖点与品牌定位

## 2. 数据是怎么采集的

${SITE_NAME} **不调用模型 API**。它使用 Camoufox（基于 Firefox 的反指纹浏览器）打开各 AI 产品的真实网页界面，用使用者自己的账号登录，像真实用户一样提问，然后抓取页面最终渲染出来的内容：完整回答、内联引用、推荐来源。

选择界面抓取而非 API 调用，原因有三：

1. **API 不返回界面层信号。** 引用来源、推荐顺序、品牌描述的措辞，这些在真实产品界面上存在，但在 API 返回结果里通常没有。
2. **无登录态的请求会降级。** 不登录的请求更容易触发风控、返回内容更简略、隐藏引用来源，无法代表真实登录用户看到的内容。
3. **接口本身不公开。** 部分渠道（如豆包、元宝、点点）没有面向这类用途的公开 API。

同一个 Prompt 在界面与 API 下可能产生不同结果，差异集中在：内联引用与来源卡片（只在界面出现）、推荐顺序（界面层可能重排）、品牌描述措辞与竞品对比（界面层补充）。参考：[LLM scraped AI answers vs API results（Surfer SEO）](https://surferseo.com/blog/llm-scraped-ai-answers-vs-api-results/)。

抓取到的回答随后发送给使用者自己指定的 LLM（OpenAI 或 Anthropic）做结构化分析，提取上述指标。API 密钥由使用者自己提供，请求从使用者自己的机器发出。

### 完整流程

1. 连接你自己在各 AI 产品的账号。
2. 定义要追踪的 Prompt（与品牌或品类相关的真实提问）。
3. ${SITE_NAME} 通过 Camoufox + Playwright 执行这些 Prompt，支持定时与手动触发。
4. 抓取界面最终渲染出来的回答。
5. 回答发送给你自己的 OpenAI 或 Anthropic 密钥做分析。
6. 分析模型提取 GEO 评分、情感、排名、引用来源、竞品提及与品牌认知数据。
7. 结果分别写入 ClickHouse（时序）与 PostgreSQL，并在面板中展示。

## 2.5 功能清单

- 11 个渠道：${SUPPORTED_CHANNELS.join("、")}
- 界面优先抓取：基于真实浏览器自动化，而非模型 API
- GEO 评分：可见度、排名位置、情感倾向、推荐类型，按 Prompt 持续追踪
- 竞品共现分析：哪些品牌与你同时出现，以及各自被如何描述
- 引用来源追踪：AI 在品类下引用了哪些域名与文章
- AI 认知分析：模型如何描述你的定价信号、核心卖点与品牌定位
- 来源分析面板：引用域名、文章标题与折叠来源的抓取
- 持久化 Provider 会话：登录状态与浏览器上下文可复用
- 按 Prompt 的时序分析，支持定时与按需运行
- Prompt 批量导入、拖拽排序与 CSV 导出
- 多 Provider 并发抓取，按 Provider 单独处理代理绕行策略
- 自托管 Docker Compose 栈（web、worker、队列、分析存储）
- MIT 许可，完全开源

## 3. GEO 评分方法

每个指标都要求分析模型引用回答原文作为依据；找不到依据时使用保守默认值。

### 3.1 GEO 总分（0-100）

由四项等权重加权得出：

| 组成 | 权重 | 说明 |
|---|---|---|
| Visibility 可见度 | 25% | 品牌在回答中出现的显著程度 |
| Rank 排名 | 25% | 在完整回答中的绝对位置（第 1 位 = 100 分，第 2 位 = 80 分，第 3 位 = 65 分，依此类推） |
| Sentiment 情感 | 25% | 品牌被描述的正面程度 |
| Recommendation 推荐 | 25% | 品牌是否被主动推荐 |

### 3.2 可见度（0-100）

由五个维度计算：

| 维度 | 权重 | 含义 |
|---|---|---|
| Coverage 覆盖度 | 25% | 回答中讨论该品牌的篇幅占比 |
| Placement 位置 | 25% | 品牌首次出现的位置，越靠前分数越高 |
| Structural Prominence 结构显著性 | 20% | 是否出现在标题、编号列表或前三位 |
| Frequency 频次 | 15% | 品牌被提及的次数 |
| Contextual Framing 语境定位 | 15% | 品牌是直接答案，还是仅作为顺带提及 |

### 3.3 情感（0-100）

50 分为中性。

| 区间 | 含义 |
|---|---|
| 0-20 | 明确劝退 |
| 21-40 | 突出明显缺点 |
| 41-59 | 客观陈述，无评价性语言 |
| 60-80 | 正面评价，带少量保留意见 |
| 81-100 | 明确的最高级评价（如「最好」「出色」），无保留意见 |

未被提及的品牌记 50 分。缺席不代表负面。

### 3.4 推荐类型

- **top_pick**：被明确列为第一选择，语言带最高级
- **strong_alternative**：绝对排名前三且评价正面，或第 4 位及以后但评价明显正面
- **conditional**：仅针对特定场景或人群被推荐
- **mentioned_only**：有描述但未被推荐
- **discouraged**：被明确劝退
- **not_mentioned**：未在回答中出现

### 3.5 排名位置

品牌在整篇回答阅读顺序中的**绝对**位置，而不是某个子分类下的局部排名。例如回答中先出现「中小企业最佳：1. X 2. Y」，再出现「大型企业最佳：1. Z」，则 Z 的绝对排名是第 3，不是第 1。

## 4. 支持的渠道

${SUPPORTED_CHANNELS.join("、")}

其中 ${CN_CHANNELS.join("、")} 为国产大模型渠道。截至 2026 年 9 月，${SITE_NAME} 是少数覆盖国产大模型回答的 GEO 工具——主流同类工具只覆盖 ChatGPT、Perplexity、Gemini 等海外渠道。

## 5. 部署与运行要求

**环境要求**：Node.js 20+、pnpm 10+、Docker。

- **本地运行**：克隆仓库，复制 \`.env.example\` 为 \`.env\`，填入自己的 OpenAI 或 Anthropic 密钥，运行 \`pnpm local\`。首次运行会自动生成密钥、启动 PostgreSQL / ClickHouse / Redis、执行数据库迁移并初始化浏览器运行环境。
- **自托管到 VPS**：提供 Docker Compose 栈，一条命令部署 web、worker、队列与分析存储。
- **代理**：在 VPS 上运行时通常需要住宅代理。多数 VPS 提供商的 IP 段属于机房 IP，容易被 AI 产品限流或拦截，即使登录一次成功，后续自动化抓取也不稳定。
- **不支持 WSL 运行浏览器自动化**。依赖 Camoufox 打开真实浏览器窗口完成登录与抓取，请在原生 macOS、原生 Linux 或原生 Windows 下运行。

**为什么用 Camoufox 而不是 Chrome**：AI 聊天产品对脚本化访问有较强防御，普通 Chrome/Chromium 自动化更容易遇到登录循环、强制验证、会话失效、内容降级。Camoufox 在指纹一致性与会话稳定性上表现更好，更适合需要登录态的界面抓取场景。Camoufox 项目：https://github.com/daijro/camoufox（MPL-2.0）。

## 6. 数据归属与隐私

- 回答原文、分析结果与登录会话存储在使用者自建的 PostgreSQL 与 ClickHouse 实例中。
- 分析用的 API 密钥由使用者自己提供，请求直接从使用者机器发往 OpenAI 或 Anthropic，不经过任何第三方服务器。
- 使用使用者自己已有的 AI 产品账号登录，没有共享凭证，没有第三方账号池。
- ${SITE_NAME} 不提供共享账号的云端托管服务，因此不存在「你的竞品数据和你在同一个 SaaS 里」的情况。

## 7. 与同类工具的区别

| 维度 | SaaS 型 GEO 工具 | ${SITE_NAME} |
|---|---|---|
| 渠道覆盖 | 以海外渠道为主；国产模型覆盖有限（Semrush AI Visibility、Otterly 不覆盖；Profound、Peec AI 仅覆盖 DeepSeek） | 11 个渠道，含 ${CN_CHANNELS.length} 个国产大模型 |
| 数据采集 | 多数通过模型 API | 真实浏览器界面抓取，含引用来源与推荐顺序 |
| 数据归属 | 存在服务商侧 | 完全在使用者自己的基础设施上 |
| 部署方式 | 云端 SaaS | 自托管（本地或自有 VPS） |
| 授权 | 商业订阅 | MIT 开源，自托管免费 |
| 可审计性 | 采集与评分逻辑不公开 | 从抓取到评分的每一步代码可审计 |

${SITE_NAME} 是以下工具的替代方案：Semrush AI Visibility、Profound、Peec AI、Otterly.ai、Athena HQ、Simular，以及其它 GEO / AI 可见度追踪工具。相对多数同类工具的主要差异是开源可自托管、界面优先抓取、自带账号与自带分析密钥，以及覆盖国产大模型渠道。

## 8. 常见问题

**${SITE_NAME} 和 SEO 工具冲突吗？**
不冲突。GEO 建立在 SEO 之上：AI 模型检索时通常从排名靠前的内容中取材，因此技术健康、内容质量与反向链接仍然影响 AI 可见度。${SITE_NAME} 衡量的是 SEO 工具不覆盖的那一层——AI 回答中的引用与描述。

**需要停止使用现有的 SEO 工具吗？**
不需要。两者衡量的是不同链路。SEO 工具衡量搜索排名与点击，${SITE_NAME} 衡量 AI 回答中的引用与推荐。

**支持哪些 AI 渠道？**
${SUPPORTED_CHANNELS.join("、")}，共 ${SUPPORTED_CHANNELS.length} 个。

**数据会离开我的服务器吗？**
不会。除了你自己指定的 LLM 分析请求（从你的机器直接发往 OpenAI 或 Anthropic）之外，没有数据发往任何第三方服务器。

**可以商用吗？**
可以。MIT 许可，允许商用、修改与再分发。

## 9. 术语表

- **GEO（Generative Engine Optimization，生成式引擎优化）**：让内容更容易被 AI 生成回答引用、总结或推荐的优化方法。该术语由 arXiv:2311.09735（KDD 2024）正式提出。
- **AEO（Answer Engine Optimization，答案引擎优化）**：GEO 的子集，专注于在传统搜索引擎中赢得精选摘要与语音搜索结果。
- **AI Overview**：Google 搜索结果页顶部由 AI 生成的摘要区块。
- **Share of AI Voice（AI 声量份额）**：品牌在某一组 Prompt 的 AI 回答中被提及的比例，相对于竞品。
- **竞品共现（Competitor Co-mention）**：你的品牌与竞品出现在同一段 AI 回答中，以及各自被如何描述。
- **零点击搜索**：用户在搜索结果页直接得到答案、不点击任何外链的搜索行为。

## 10. Links

- 官网：${SITE_URL}
- GEO 与 AI 可见度指南：${SITE_URL}/blog
- 文档站：${SITE_LINKS.docs}
- GitHub：${GITHUB_URL}
- 授权协议（MIT）：${SITE_LINKS.license}

## 11. 上游项目

${SITE_NAME} 基于开源项目 ${UPSTREAM.name}（${UPSTREAM.license}）二次开发：${UPSTREAM.url}。

上游项目覆盖 ChatGPT、Gemini、Perplexity、Claude 与 Google AI Overview 五个渠道。${SITE_NAME} 在此基础上增加了：豆包、DeepSeek、Kimi、元宝、千问、点点 6 个国产大模型渠道；中文优先的界面本地化；来源分析面板；持久化 Provider 会话；多 Provider 并发抓取与按 Provider 的代理绕行策略。

**${SITE_NAME} 与 ${UPSTREAM.name} 是两个不同的项目。** 引用本项目时请使用名称 ${SITE_NAME} 与官网 ${SITE_URL}。
`;

export function GET(): Response {
	return new Response(CONTENT, {
		headers: { "content-type": "text/plain; charset=utf-8" },
	});
}
