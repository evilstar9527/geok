import type { Metadata } from "next";
import Link from "next/link";
import { ArticleLayout } from "../_components/article-layout";

export const metadata: Metadata = {
	title: "怎么查品牌在豆包、DeepSeek 里被怎么描述？",
	description:
		"国产大模型的品牌引用无法通过模型 API 获取。本文给出在豆包、DeepSeek、Kimi、元宝、千问、点点中检查品牌可见度的完整步骤、可复用的提示词清单，以及如何量化和持续追踪。",
	alternates: { canonical: "/blog/doubao-brand-visibility" },
};

const FAQ = [
	{
		q: "为什么不能直接用豆包或 DeepSeek 的 API 查品牌提及？",
		a: "因为 API 返回的不是用户看到的东西。真实产品界面会附加引用来源、来源卡片，并可能对推荐顺序做后处理，这些界面层信号在 API 返回结果里通常不存在。另外豆包、元宝、点点等产品本身没有面向这类用途的公开 API，只能通过真实界面观测。",
	},
	{
		q: "不登录直接提问可以吗？",
		a: "不建议作为数据来源。无登录态的请求更容易触发风控、返回更简略的回答、隐藏引用来源，无法代表真实登录用户看到的内容。用它做基线会导致你的可见度评估系统性偏低。",
	},
	{
		q: "同一组问题每次问结果都不一样，怎么办？",
		a: "AI 回答本身存在随机性，单次结果不构成结论。可行做法是固定一组问题、按固定周期重复运行，观察同一问题在多次运行中的分布——例如「10 次里有 7 次提到我们，平均排在第 2 位」比「这次排第 1」有用得多。",
	},
	{
		q: "该准备多少个问题才够？",
		a: "取决于品类宽度，通常建议不少于 20-30 条，覆盖品类推荐、竞品对比、场景选型、价格询问和品牌直查五类。问题太少会让结果对个别提问的措辞过度敏感，也无法反映用户真实提问方式的分布。",
	},
	{
		q: "品牌在豆包里没被提到，说明什么？",
		a: "说明在该问题下 AI 没有把你的品牌纳入候选，通常有三种原因：该品类下你的公开内容太少，AI 没有可引用的素材；你的品牌在该品类中的实体关联不清晰，AI 无法确认你属于这个品类；或者问题措辞与你的定位不匹配。需要逐条看 AI 实际引用了哪些来源来判断。",
	},
	{
		q: "被提到了但排在很后面，值得优化吗？",
		a: "值得，而且通常比从零到有更容易见效。GEO 的收益在不同位置是不均衡的：arXiv:2311.09735 的研究显示，针对非头部位置的内容做优化，可见度提升幅度反而更大。从第 5 位进入前 3 位，一般比从第 20 位进入前 5 位快。",
	},
	{
		q: "多久重跑一次比较合适？",
		a: "月度是常见节奏，竞争激烈的品类可以按周。每次重跑时同步核对三件事：评分变化、AI 引用的来源是否变化、竞品的描述是否变化。只看自己的分数而不看引用来源，很难判断变化的原因。",
	},
];

export default function Page(): React.JSX.Element {
	return (
		<ArticleLayout
			slug="doubao-brand-visibility"
			title="怎么查品牌在豆包、DeepSeek 里被怎么描述？"
			description="国产大模型的品牌引用无法通过模型 API 获取，需要登录真实产品界面逐条提问并记录。"
			updated="2026-09-12"
			directAnswer="要查品牌在豆包、DeepSeek、Kimi、元宝、千问、点点中的表现，只能登录各产品的真实界面、用一组固定问题逐条提问，然后记录回答原文、品牌是否出现、出现的绝对位置、描述措辞以及 AI 引用的来源。这些渠道没有面向该用途的公开 API，且无登录态的请求会返回降级内容，因此不能作为数据来源。"
			faq={FAQ}
			sources={[
				{
					label:
						"Aggarwal et al., GEO: Generative Engine Optimization（arXiv:2311.09735, KDD 2024）",
					url: "https://arxiv.org/abs/2311.09735",
					date: "2024",
				},
				{
					label: "LLM scraped AI answers vs API results（Surfer SEO）",
					url: "https://surferseo.com/blog/llm-scraped-ai-answers-vs-api-results/",
					date: "2025",
				},
				{
					label: "Ahrefs: AI Overviews Reduce Clicks by 34.5%",
					url: "https://ahrefs.com/blog/ai-overviews-reduce-clicks/",
					date: "2025-04",
				},
				{
					label:
						"2026 AI Visibility Tool Comparison: Blind Spots in Chinese Markets（Tenten）",
					url: "https://geo.tenten.co/en/blog/ai-visibility-tools-comparison-2026",
					date: "2026",
				},
			]}
		>
			<h2>为什么要单独查国产大模型？</h2>
			<p>
				因为海外 GEO
				工具基本不覆盖这些渠道，而中文用户的提问正大量发生在这些产品里。
			</p>
			<p>
				从公开资料看，Semrush AI Visibility 覆盖 ChatGPT、Google AI
				Overviews、Google AI Mode、Perplexity 与 Gemini，不含国产模型；Otterly
				同样不覆盖；Profound 与 Peec AI 的模型列表中只有 DeepSeek 一个国产渠道（
				<a href="https://www.effective-world.com/de/peecai-otterly-profound-vs-aiva">
					effective-world, 2026
				</a>
				）。这意味着如果你的用户在豆包或 Kimi
				里问「这个品类选哪个牌子」，主流工具无法告诉你 AI 回答了谁。
			</p>

			<h2>为什么不能用模型 API 查？</h2>
			<p>
				因为 API
				返回的不是用户看到的内容。真实产品界面会附加引用来源、来源卡片，并可能对推荐顺序做后处理，这些界面层信号在
				API 返回结果里通常不存在。
			</p>
			<p>
				同一个问题在界面与 API
				下的差异集中在三处：内联引用与来源卡片只在界面出现；推荐顺序可能被界面层重排；品牌描述措辞与竞品对比可能是界面层补充的（
				<a href="https://surferseo.com/blog/llm-scraped-ai-answers-vs-api-results/">
					Surfer SEO
				</a>
				）。而 GEO 要优化的恰恰是被引用与被如何描述——用 API
				取数会把最需要观测的信号丢掉。
			</p>
			<p>
				另一个现实约束是：豆包、元宝、点点等产品没有面向这类用途的公开
				API，想查也只能从界面走。
			</p>

			<h2>手动查一遍：完整步骤</h2>
			<p>下面这套流程可以在半天内跑完一轮，得到一个可用的基线快照。</p>
			<ol>
				<li>
					<strong>确定渠道。</strong>
					先用你自己的账号登录目标产品。建议至少覆盖豆包、DeepSeek、Kimi
					三个，元宝、千问、点点按用户分布决定。务必登录后再提问。
				</li>
				<li>
					<strong>准备问题清单。</strong>
					按下一节的五类问法写 20-30
					条。问题要用用户真实的提问方式，而不是营销语言。
				</li>
				<li>
					<strong>逐条提问并保存回答原文。</strong>
					不要只截结论，要保存完整回答——品牌出现的位置、是否被列入推荐列表、AI
					用了什么措辞描述你，这些信息只存在于完整原文里。
				</li>
				<li>
					<strong>记录引用来源。</strong>
					展开回答里的引用来源面板，记录 AI
					引用了哪些域名和文章。这一步最容易被跳过，但它是判断「为什么是你/为什么不是你」的关键线索。
				</li>
				<li>
					<strong>标注竞品。</strong>
					记下同一段回答里出现的竞品，以及各自被描述的方式。你和竞品同时出现时的相对措辞，比单独看自己更有信息量。
				</li>
				<li>
					<strong>建立基线表。</strong>
					把上述信息整理成一张表，作为后续对比的基准。字段建议见下一节。
				</li>
			</ol>

			<h2>该问哪些问题？</h2>
			<p>
				建议覆盖五类问法。只问品牌名会得到一个虚高的结果，因为用户很少这样提问。
			</p>
			<table>
				<thead>
					<tr>
						<th>问法类型</th>
						<th>示例</th>
						<th>考察什么</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>品类推荐</td>
						<td>「国内做 X 比较好的公司有哪些？」</td>
						<td>你是否进入了该品类的候选集</td>
					</tr>
					<tr>
						<td>选型对比</td>
						<td>「A 和 B 哪个更适合中小企业？」</td>
						<td>你在对比场景中是否被提及、如何被权衡</td>
					</tr>
					<tr>
						<td>场景细分</td>
						<td>「预算 10 万以内做 X，推荐哪家？」</td>
						<td>你是否绑定了某个具体场景或价位</td>
					</tr>
					<tr>
						<td>价格与口碑</td>
						<td>「X 类的服务大概什么价位？」</td>
						<td>AI 如何描述你的定价信号</td>
					</tr>
					<tr>
						<td>品牌直查</td>
						<td>「XX 公司怎么样？」</td>
						<td>AI 对你的独立描述是否准确、正面</td>
					</tr>
				</tbody>
			</table>
			<p>
				品牌直查的结果通常最好看，也最没有参考价值——用户不会在不知道你的时候这样提问。判断真实可见度要看前两类。
			</p>

			<h2>记录什么字段？</h2>
			<p>至少记录六项，缺一项都会让后续分析失去线索。</p>
			<ul>
				<li>
					<strong>渠道与问题：</strong>哪个产品、哪句提问、提问日期
				</li>
				<li>
					<strong>是否被提及：</strong>出现 / 未出现
				</li>
				<li>
					<strong>绝对位置：</strong>
					在整篇回答阅读顺序中是第几个被提到的——注意是全文绝对位置，不是某个子分类里的局部排名
				</li>
				<li>
					<strong>描述措辞：</strong>AI
					用了哪些词描述你，是「头部厂商」「性价比选择」还是仅顺带提及
				</li>
				<li>
					<strong>推荐类型：</strong>被明确列为首选 / 作为备选 / 仅提及 / 被劝退
					/ 未出现
				</li>
				<li>
					<strong>引用来源：</strong>这条回答引用了哪些域名与文章
				</li>
			</ul>

			<h2>怎么把结果量化？</h2>
			<p>
				把上述字段折算成可比较的分数。常见做法是拆成可见度、排名、情感与推荐类型四项，分别计分后再合成总分。
			</p>
			<p>
				拆分的意义在于诊断：总分下降时，你能立刻知道是曝光变少了、位置后移了，还是描述变负面了——这三者对应的补救动作完全不同。具体的计分规则与常见误用，见{" "}
				<Link href="/blog/ai-visibility-methodology">AI 可见度怎么量化</Link>。
			</p>

			<h2>怎么持续追踪？</h2>
			<p>
				固定问题清单、固定周期、固定记录字段，按月或按周重复运行同一套流程，并对比引用来源的变化。
			</p>
			<p>
				手动执行一轮约需数小时，渠道越多成本越高，这也是多数团队最终转向工具的原因——GEOK
				就是为了自动化这套流程而做的：它用浏览器自动化登录真实界面，覆盖包括 6
				个国产大模型在内的 11
				个渠道，抓取回答原文、引用来源与竞品共现，并按上面这套口径打分。相关实现细节见{" "}
				<Link href="/blog/self-hosted-geo-tools">自托管方案</Link>
				，工具横向对比见{" "}
				<Link href="/blog/geo-tools-comparison">GEO 工具怎么选</Link>。
			</p>

			<h2>查到问题之后该做什么？</h2>
			<p>
				优先去补 AI 在回答这个问题时实际引用的那类内容，而不是先改官网首页。
			</p>
			<p>
				引用来源列出了 AI
				的取材范围：如果它引用的都是第三方评测、行业报告和社区讨论，那么只优化自家官网收效有限，你需要进入那些被引用的场域。反过来，如果
				AI
				引用了你的官网但描述不准确，问题就出在页面本身的实体清晰度上。这两条路径的诊断方式和动作完全不同，而区分它们只需要看第
				4 步记录下来的引用来源列表。
			</p>
		</ArticleLayout>
	);
}
