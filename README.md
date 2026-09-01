# GEOK — AI 可见度与 GEO 追踪工具

**GEOK** 是一款用于追踪品牌在 AI 生成回答中出现情况的工具，基于开源项目 [OneGlanse](https://github.com/aryamantodkar/oneglanse) 二次开发。它不通过模型 API 抓取数据，而是像真实用户一样打开 ChatGPT、Gemini、Perplexity、Claude、Google AI Overview 等产品界面，此外还新增了对豆包、DeepSeek、Kimi、元宝、千问等国产大模型的完整支持，更贴合国内使用场景。完全自托管，代码开源。

**它不调用模型 API。** GEOK 会在真实浏览器中打开 ChatGPT、Gemini、Perplexity、Claude、AI Overview 以及豆包、DeepSeek、Kimi、元宝、千问等真实产品界面，像用户一样操作，抓取页面最终渲染出来的内容：完整回答、内联引用、推荐来源，以及你的品牌相对竞品的呈现方式。这些信息在 API 返回结果里通常是没有的。

**抓取完成后，GEOK 使用你自己的 OpenAI 或 Anthropic 密钥进行分析。** 每次 Prompt 运行结束后，抓取到的回答会被发送给你指定的 LLM（OpenAI GPT 或 Claude），提取出 GEO 分数、情感倾向、可见度、排名位置、竞品共现、引用来源，以及展示在面板中的 AI 认知拆解。密钥由你自己提供，请求直接从你的机器发往 OpenAI/Anthropic，不经过任何第三方服务器。

**数据留在你自己的机器上。** 回答内容、分析结果以及登录会话都存储在你自己搭建和管理的 PostgreSQL 与 ClickHouse 实例中，无论是本地 Docker 还是自有 VPS，都不会有数据被发送到外部服务器。

**使用你自己的账号。** GEOK 通过你自己已有的账号登录 ChatGPT、Gemini、Perplexity、Claude、Google，以及豆包、DeepSeek、Kimi、元宝、千问。没有共享凭证，没有第三方账号池，登录会话只保存在本地。

---

## 相对上游项目的功能升级

在 OneGlanse 的基础上，GEOK 做了以下升级：

- **接入 5 个国产大模型：** 豆包（字节跳动）、DeepSeek、Kimi（月之暗面）、元宝（腾讯）、千问（阿里巴巴），叠加原有的 ChatGPT / Gemini / Perplexity / Claude / Google AI Overview，共 10 个渠道
- **中文优先的界面本地化**，语言切换入口移到页头
- **来源分析面板（Source Analytics）**，展示引用域名、文章标题及折叠来源的抓取
- **持久化 Provider 会话/上下文**，登录状态与浏览器上下文可复用，避免重复认证
- **豆包专项适配**：延迟验证码识别、下载弹窗处理、来源面板展开、会话稳定等待
- **千问登录加固**，仅保存与千问相关的必要登录域名，避免整个阿里云账号会话被上传
- **支持多 Provider 并发抓取**，并按 Provider 单独处理代理绕行策略
- **Prompt 拖拽排序**，排序结果持久化保存
- **改进的 Prompt 选择与详情操作交互**

---

## 快速开始

**环境要求：** Node.js 20+、pnpm 10+、Docker

**不支持 WSL 运行浏览器自动化。** GEOK 依赖 Camoufox 打开真实的 Provider 浏览器窗口完成登录和 UI 抓取。请在原生 macOS、原生 Linux 或原生 Windows 下运行本地环境，不要在 WSL 中运行——WSL/WSLg 可能只显示 Camoufox 的任务栏图标而没有可用的登录窗口，导致无法正常选择账号登录。

如果还没有 pnpm：`npm install -g pnpm@latest`

```bash
git clone https://github.com/evilstar9527/geok
cd geok
cp .env.example .env
```

打开 `.env`，填入你的 LLM API 密钥，这是唯一必须配置的项，其余都会自动配置：

```bash
# 二选一：
OPENAI_API_KEY=sk-...

# 或者使用 Claude：
ANTHROPIC_API_KEY=sk-ant-...
ANALYSIS_LLM_PROVIDER=claude
```

然后启动：

```bash
pnpm local
```

启动后访问 [http://localhost:3000](http://localhost:3000)。首次运行会自动生成密钥、启动 Postgres / ClickHouse / Redis、执行数据库迁移并初始化浏览器运行环境。用邮箱注册即可，Google OAuth 是可选项，不是必须的。

登录后进入 `/providers` 连接你的 AI 账号，然后添加 Prompt 并运行。

---

## 功能一览

- **10 个渠道：** ChatGPT、Gemini、Perplexity、Claude、Google AI Overview、豆包、DeepSeek、Kimi、元宝、千问
- **UI 优先抓取：** 基于浏览器自动化抓取真实产品界面，而不是调用 API，用户看到什么，你就拿到什么
- **GEO 评分：** 可见度、排名位置、情感倾向、推荐类型，按 Prompt 持续追踪
- **竞品共现分析：** 查看哪些品牌与你同时出现，以及如何被描述
- **引用来源追踪：** AI 产品在你所在品类下引用了哪些域名和文章
- **AI 认知分析：** 模型如何描述你的定价信号、核心卖点与品牌定位
- **使用你自己的 LLM 密钥：** 分析过程直接用你自己的 OpenAI/Anthropic 密钥，从你自己的机器发出请求
- **ClickHouse 分析存储：** 面向大规模 Prompt 追踪设计的时间序列存储
- **完全自托管：** 一条命令即可部署到任意 VPS

---

## 为什么没有云端版本

GEOK 依赖的是真实登录状态下的浏览器会话，而不是无登录态或 API 调用。无登录态的体验通常更容易触发风控、返回内容更简略、隐藏引用来源，且无法代表真实登录用户看到的内容。因此 GEOK 不提供共享账号的云端托管服务，而是让你用自己的账号、自己的浏览器会话、自己的代理，在自己的基础设施上运行。

---

## 为什么用 Camoufox 而不是 Chrome

GEOK 使用 [Camoufox](https://github.com/daijro/camoufox)（一款基于 Firefox 的反指纹浏览器）来维持 Provider 会话。AI 聊天产品对脚本化访问有较强的防御，普通 Chrome/Chromium 自动化更容易遇到登录循环、强制验证、会话失效、内容降级等问题。Camoufox 在指纹一致性和会话稳定性上表现更好，更适合这种需要登录态的 UI 抓取场景。

---

## 为什么 VPS 上需要代理

本地运行通常不需要代理，因为请求来自正常的家庭/办公 IP。多数 VPS 提供商的 IP 段属于机房 IP，容易被 AI 产品限流或拦截，即使登录一次成功，后续自动化抓取也很不稳定。因此自托管在 VPS 上时，需要通过住宅代理让浏览器流量从住宅 IP 出口。

---

## 技术栈

| 层 | 技术 |
|---|---|
| Web 应用 | Next.js 15, React 19, tRPC, Drizzle ORM |
| 浏览器 Worker | Camoufox, Playwright, BullMQ |
| 分析数据库 | ClickHouse |
| 关系型数据库 | PostgreSQL 16 |
| 队列 | Redis |
| 认证 | Better Auth |
| 回答分析 | OpenAI 或 Anthropic（使用你自己的密钥） |

---

## GEO 评分说明

抓取到回答后，会连同结构化分析 Prompt 一起发送给你的 LLM（OpenAI 或 Anthropic），由模型读取原始回答文本并给出下方指标。完整的分析 Prompt 在 [`packages/services/src/analysis/analysisPrompt.ts`](packages/services/src/analysis/analysisPrompt.ts)。

每个指标都要求模型引用回答中的原文作为依据，如果找不到依据，则使用保守的默认值。

### GEO 总分（0–100）

由以下四项等权重加权得出：

| 组成 | 权重 | 说明 |
|---|---|---|
| Visibility 可见度 | 25% | 品牌在回答中出现的显著程度 |
| Rank 排名 | 25% | 在完整回答中的绝对位置（第 1 位 = 100 分，第 2 位 = 80 分，第 3 位 = 65 分……） |
| Sentiment 情感 | 25% | 品牌被描述的正面程度 |
| Recommendation 推荐 | 25% | 品牌是否被主动推荐 |

### Visibility 可见度（0–100）

由五个维度计算：

- **Coverage 覆盖度**（25%）：回答中讨论该品牌的篇幅占比
- **Placement 位置**（25%）：品牌首次出现的位置（越靠前分数越高）
- **Structural Prominence 结构显著性**（20%）：是否出现在标题、编号列表或前三位
- **Frequency 频次**（15%）：品牌被提及的次数
- **Contextual Framing 语境定位**（15%）：品牌是否是直接答案，还是仅作为顺带提及

### Sentiment 情感（0–100）

50 分为中性：

| 区间 | 含义 |
|---|---|
| 0–20 | 明确劝退 |
| 21–40 | 突出明显缺点 |
| 41–59 | 客观陈述，无评价性语言 |
| 60–80 | 正面评价，带少量保留意见 |
| 81–100 | 明确的最高级评价（如“最好”“出色”），无保留意见 |

未被提及的品牌记 50 分，缺席不代表负面。

### Recommendation 推荐类型

- **top_pick：** 被明确列为第一选择，语言带最高级
- **strong_alternative：** 绝对排名前三且评价正面，或第 4 位及以后但评价明显正面
- **conditional：** 仅针对特定场景或人群被推荐
- **mentioned_only：** 有描述但未被推荐
- **discouraged：** 被明确劝退
- **not_mentioned：** 未在回答中出现

### Rank Position 排名位置

品牌在整篇回答阅读顺序中的绝对位置，而不是某个子分类下的局部排名。例如回答中出现“中小企业最佳：1. X 2. Y”与“大型企业最佳：1. Z”，Z 的绝对排名是第 3，不是第 1。

---

## 致谢

本项目基于开源项目 [OneGlanse](https://github.com/aryamantodkar/oneglanse)（MIT License）二次开发，感谢原作者的工作。

同时感谢以下开源项目：

| 项目 | 用途 | License |
|---|---|---|
| [Camoufox](https://github.com/daijro/camoufox) | 用于所有 Provider 会话的反指纹浏览器 | MPL-2.0 |
| [Playwright](https://github.com/microsoft/playwright) | 浏览器自动化 | Apache-2.0 |
| [BullMQ](https://github.com/taskforcesh/bullmq) | Redis 队列 | MIT |
| [ClickHouse](https://github.com/ClickHouse/ClickHouse) | 分析与时间序列存储 | Apache-2.0 |
| [Drizzle ORM](https://github.com/drizzle-team/drizzle-orm) | TypeScript ORM | Apache-2.0 |
| [Better Auth](https://github.com/better-auth/better-auth) | 认证框架 | MIT |
| [Turndown](https://github.com/mixmark-io/turndown) | HTML 转 Markdown | MIT |

---

## License

MIT
