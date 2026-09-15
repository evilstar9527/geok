import type { Metadata } from "next";
import Link from "next/link";
import { ArticleLayout } from "../_components/article-layout";

export const metadata: Metadata = {
	title: "什么是 GEO（生成式引擎优化）？与 SEO、AEO 的区别",
	description:
		"GEO 是让内容被 AI 生成回答引用、总结或推荐的优化方法。本文给出 GEO 的定义、学术出处、与 SEO 和 AEO 的逐项对比，以及经过验证的 GEO 原则。",
	alternates: { canonical: "/blog/what-is-geo" },
};

const FAQ = [
	{
		q: "GEO 和 SEO 是同一件事吗？",
		a: "不是。SEO 优化的是在搜索结果列表中的排名位置，目标是让用户看到并点击你的链接。GEO 优化的是内容被 AI 生成回答引用、总结或推荐的概率，目标是被 AI 选中作为信息来源。两者衡量的链路不同，但基础是共用的：技术健康、内容质量与反向链接同时影响两者。",
	},
	{
		q: "做 GEO 需要停止做 SEO 吗？",
		a: "不需要。两者互补。AI 生成回答在检索信息时通常从已有排名靠前的内容中取材，因此 SEO 做得好的页面在 GEO 上有基础优势。反过来，GEO 要求的结构化、可验证的内容组织方式，也会提升页面在传统搜索中的表现。",
	},
	{
		q: "GEO 多久能看到效果？",
		a: "取决于渠道。带实时检索的渠道（Perplexity、Google AI Overview）对新内容与更新的反应较快，通常在数天到数周内体现。以训练数据为主的模型更新频率较低，但带联网能力的回答仍能访问较新的内容。跨渠道观察到可衡量的变化，一般需要数周量级。",
	},
	{
		q: "GEO 真的有效果吗？有研究支持吗？",
		a: "有。arXiv:2311.09735（KDD 2024）用 10000 条查询构建了 GEO-Bench 基准，测试了 9 种内容优化策略。结果显示添加统计数据、引用来源、引用专家原话这三类「可验证外部证据」的策略带来的可见度提升最大，而关键词堆砌产生负收益。",
	},
	{
		q: "AEO 和 GEO 是什么关系？",
		a: "AEO（答案引擎优化）是 GEO 的子集。AEO 专门针对传统搜索引擎中的精选摘要与语音助手结果，主要手段是 FAQ 结构化数据、简洁问答格式和 HowTo 标记。GEO 覆盖 AEO 的全部范围，并扩展到 ChatGPT、Claude 这类没有「摘要位」概念的独立 AI 助手。",
	},
	{
		q: "中文内容做 GEO 有什么特殊之处？",
		a: "主要差别在渠道。面向中文用户时，豆包、DeepSeek、Kimi、元宝、千问、点点是必须覆盖的渠道，而这些渠道的回答无法通过模型 API 获取，只能通过真实产品界面观测。多数 GEO 工具只覆盖海外渠道，因此中文品牌需要确认工具的渠道范围是否匹配自己的用户。",
	},
	{
		q: "怎么衡量 GEO 有没有做对？",
		a: "至少要看四项：目标 Prompt 下你的品牌是否出现在 AI 回答中、出现时的绝对排名、被描述的情感倾向、以及是否被主动推荐。同时要看 AI 在该品类下引用了哪些来源——如果你的域名从未出现在引用列表中，说明内容还没有进入 AI 的取材范围。",
	},
];

export default function Page(): React.JSX.Element {
	return (
		<ArticleLayout
			slug="what-is-geo"
			title="什么是 GEO（生成式引擎优化）？与 SEO、AEO 的区别"
			description="GEO 是让内容被 AI 生成回答引用、总结或推荐的优化方法。"
			updated="2026-09-12"
			directAnswer="GEO 是 Generative Engine Optimization 的缩写，中文通常译为生成式引擎优化：它指一套让内容更容易被 AI 生成回答引用、总结或推荐的优化方法。与 SEO 追求搜索排名不同，GEO 追求的是被 AI 选中作为信息来源。该术语由 arXiv:2311.09735（KDD 2024）正式提出。"
			faq={FAQ}
			sources={[
				{
					label:
						"Aggarwal et al., GEO: Generative Engine Optimization（arXiv:2311.09735, KDD 2024）",
					url: "https://arxiv.org/abs/2311.09735",
					date: "2024",
				},
				{
					label: "Ahrefs: AI Overviews Reduce Clicks by 34.5%",
					url: "https://ahrefs.com/blog/ai-overviews-reduce-clicks/",
					date: "2025-04",
				},
				{
					label: "Ahrefs: Update — AI Overviews Reduce Clicks by 58%",
					url: "https://ahrefs.com/blog/ai-overviews-reduce-clicks-update/",
					date: "2026-02",
				},
				{
					label: "schema.org 结构化数据词汇表",
					url: "https://schema.org/",
					date: "持续更新",
				},
				{
					label: "llms.txt 提案",
					url: "https://llmstxt.org/",
					date: "2024",
				},
			]}
		>
			<h2>GEO 是什么？</h2>
			<p>
				GEO 是一套让内容更容易被 AI
				生成回答引用、总结或推荐的优化方法。它衡量的对象不是搜索排名，而是你的内容有没有进入
				AI 的取材范围。
			</p>
			<p>
				在传统搜索里，用户看到一串蓝色链接，然后自己选择点击哪一个。AI
				生成回答改变了这个链路：模型从多个来源检索信息，合成一段完整的回答，可能引用也可能不引用原始来源，而用户往往不点击任何链接就得到了答案。品牌需要优化的目标，因此从「排在第几」变成了「是否被引用、以及被如何描述」。
			</p>
			<p>
				一个直接的后果是：只做 SEO 已经不够。Ahrefs 在 2025 年 4 月对 30
				万个关键词的研究中发现，出现 AI Overviews
				的搜索中，排名第一的页面点击率比同类无 AI Overviews 的搜索低
				34.5%；该研究在 2026 年 2 月更新后，这个数字扩大到 <strong>58%</strong>
				（
				<a href="https://ahrefs.com/blog/ai-overviews-reduce-clicks-update/">
					Ahrefs, 2026
				</a>
				）。排名第一不再等于被看见。
			</p>

			<h2>GEO 这个词是从哪来的？</h2>
			<p>
				GEO 由 arXiv:2311.09735《GEO: Generative Engine
				Optimization》正式提出，该论文发表于 KDD 2024，作者来自普林斯顿大学、IIT
				德里与 Adobe Research。
			</p>
			<p>
				论文把生成引擎定义为「通过合成多个来源的信息来生成回答的 AI
				驱动搜索系统」，并构建了 GEO-Bench 基准——包含 10000 条查询，用于测试 9
				种内容优化策略在生成引擎回答中的效果。这是目前关于 GEO
				最完整的一份对照实验，后文引用的策略效果数据均来自这项工作。
			</p>

			<h2>GEO 和 SEO 有什么区别？</h2>
			<p>
				SEO 针对「被发现」优化，让你的页面出现在用户面前；GEO
				针对「被提取」优化，让你的内容容易被 AI 理解、信任和引用。
			</p>
			<p>
				这个差别会传导到具体的做法上。SEO
				关注标题标签、关键词相关性、反向链接、页面速度、域名权重；GEO
				在此基础上额外要求实体清晰度、可验证的引用来源、自成一体的答案区块，以及跨平台的存在感。SEO
				的成果集中在网站上，GEO
				的成果分散在你的网站、LinkedIn、知乎、Reddit、GitHub、YouTube
				等多个平台——因为 AI 模型综合的是整个网络上关于你的信息。
			</p>

			<h3>SEO、GEO、AEO 逐项对比</h3>
			<table>
				<thead>
					<tr>
						<th>维度</th>
						<th>SEO</th>
						<th>GEO</th>
						<th>AEO</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>核心目标</td>
						<td>在目标关键词上获得靠前排名</td>
						<td>被 AI 生成回答引用、总结或推荐</td>
						<td>赢得精选摘要与答案框</td>
					</tr>
					<tr>
						<td>目标平台</td>
						<td>Google、Bing 自然结果</td>
						<td>
							ChatGPT、Google AI Overview、Perplexity、Claude、豆包、DeepSeek 等
						</td>
						<td>Google 精选摘要、语音助手</td>
					</tr>
					<tr>
						<td>成功指标</td>
						<td>关键词排名、自然流量、点击率</td>
						<td>AI 引用次数、品牌提及、AI 声量份额、来自 AI 平台的推荐流量</td>
						<td>摘要出现次数、零位排名</td>
					</tr>
					<tr>
						<td>内容形态</td>
						<td>关键词优化的页面、标题标签、内链</td>
						<td>自成一体的答案段落、对比表、可被重排的结构化数据</td>
						<td>简洁问答、结构化数据</td>
					</tr>
					<tr>
						<td>优化重点</td>
						<td>站内优化、反向链接、技术健康度</td>
						<td>实体清晰度、E-E-A-T 信号、多平台存在、可引用的数据来源</td>
						<td>FAQ / HowTo 标记、答案可读性</td>
					</tr>
					<tr>
						<td>内容范围</td>
						<td>以网站为中心</td>
						<td>多平台（网站 + 社交 + 社区 + 代码托管）</td>
						<td>以网站为中心，强调结构化数据</td>
					</tr>
					<tr>
						<td>用户行为</td>
						<td>用户点击链接访问你的页面</td>
						<td>AI 阅读并合成你的内容，用户直接看到你的品牌</td>
						<td>用户看到摘要或听到语音播报</td>
					</tr>
					<tr>
						<td>学术出处</td>
						<td>随搜索引擎演化，无单一起点</td>
						<td>arXiv:2311.09735（KDD 2024）</td>
						<td>随精选摘要与语音助手出现</td>
					</tr>
					<tr>
						<td>关系</td>
						<td>GEO 与 AEO 的共同基础</td>
						<td>把 SEO 扩展到 AI 原生发现，范围大于 AEO</td>
						<td>GEO 的子集</td>
					</tr>
				</tbody>
			</table>

			<h2>GEO 和 AEO 有什么区别？</h2>
			<p>
				AEO（Answer Engine Optimization，答案引擎优化）是 GEO
				的子集，只针对传统搜索引擎中的精选摘要与语音搜索结果。
			</p>
			<p>
				AEO 的典型手段是 FAQ 结构化数据、简洁的问答格式和 HowTo
				标记。如果你已经在做这些，那么你在 GEO 上有了起跑优势。但 AEO 解决不了
				GEO 的另外几件事：多平台存在、实体清晰度，以及可引用的数据来源——因为
				ChatGPT、Claude
				这类独立助手根本没有「摘要位」这个概念，它们评估的是内容的可信度与可提取性。
			</p>

			<h2>哪些做法真的能提升 AI 可见度？</h2>
			<p>
				在 arXiv:2311.09735 测试的 9
				种策略中，效果最好的三种都与「可验证的外部证据」有关，而关键词堆砌产生负收益。
			</p>
			<p>论文报告的策略效果如下（数值为论文报告值，具体口径以原文为准）：</p>
			<ul>
				<li>
					<strong>添加统计数据：+115.1%</strong>——用具体数字和百分比替代模糊表述
				</li>
				<li>
					<strong>引用来源：+77.0%</strong>——对事实性陈述给出可核查的出处
				</li>
				<li>
					<strong>引用专家原话：+72.2%</strong>——带署名与出处的引语
				</li>
				<li>
					<strong>权威语气：+21.5%</strong>
				</li>
				<li>
					<strong>提升流畅度：+15.2%</strong>
				</li>
				<li>
					<strong>关键词堆砌：−10.2%</strong>——主动损害可见度
				</li>
			</ul>
			<p>
				这个结果对中文内容团队的直接含义是：把「许多企业都在关注
				GEO」改写成「Ahrefs 对 30 万个关键词的研究显示，出现 AI Overviews
				的搜索中首位页面点击率下降 34.5%（Ahrefs,
				2025）」，是同一段文字里收益最高的改动。
			</p>

			<h2>怎么开始做 GEO？</h2>
			<p>
				从审计现状开始，而不是从写新内容开始——先确认 AI
				现在如何描述你，再决定补什么。
			</p>
			<ol>
				<li>
					<strong>做一次 AI 可见度审计。</strong>
					在你所在品类最核心的几个提问上，逐渠道查看你的品牌是否出现、被怎么描述、AI
					引用了谁的内容。渠道清单应与你的用户实际使用的一致，中文品牌需要包含豆包、DeepSeek
					等国产渠道。
				</li>
				<li>
					<strong>检查实体清晰度。</strong>
					你的网站、llms.txt、结构化数据、GitHub、社交资料是否使用完全一致的品牌名称与定位。命名不一致会让
					AI 无法确认这些信息属于同一个实体。
				</li>
				<li>
					<strong>补上可被引用的内容。</strong>
					针对买家的真实提问写长文，每篇以 2-4
					句直接答案开头，小节标题用问句，并保证每 200-300
					字至少有一个带出处的外部引用。
				</li>
				<li>
					<strong>建月度节奏。</strong>
					重新审计、更新过期数据、补充新出现的子话题、核对失效链接。
				</li>
			</ol>
			<p>
				关于第 1 步的具体做法，见{" "}
				<Link href="/blog/doubao-brand-visibility">
					怎么查品牌在豆包、DeepSeek 里被怎么描述
				</Link>
				；关于第 3 步如何组织一篇 GEO 友好的长文，见{" "}
				<Link href="/blog/ai-visibility-methodology">AI 可见度怎么量化</Link>
				。如果你需要对比工具，见{" "}
				<Link href="/blog/geo-tools-comparison">GEO 工具怎么选</Link>。
			</p>
		</ArticleLayout>
	);
}
