import type { ReportData } from "@oneglanse/types";
import styles from "./jianke-report.module.css";

const MODEL_NAMES: Record<string, string> = {
	kimi: "Kimi",
	doubao: "豆包",
	deepseek: "DeepSeek",
	yuanbao: "元宝",
	qianwen: "千问",
	diandian: "点点",
	chatgpt: "ChatGPT",
	gemini: "Gemini",
	perplexity: "Perplexity",
	grok: "Grok",
};
const modelName = (name: string) => MODEL_NAMES[name.toLowerCase()] ?? name;
const rate = (count: number, total: number) =>
	total > 0 ? `${Math.round((count / total) * 1000) / 10}%` : "待分析";
function date(value: string | null | undefined) {
	if (!value) return "未记录";
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime())
		? "未记录"
		: new Intl.DateTimeFormat("sv-SE", {
				timeZone: "Asia/Shanghai",
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
			}).format(parsed);
}

export function JiankeReportViewer({ data }: { data: ReportData }) {
	const snapshot = data.templateSnapshot;
	const analysed = snapshot?.analysed ?? data.totalResponses;
	const mentioned =
		snapshot?.mentioned ??
		data.mentionRates.find((entry) => entry.isBrand)?.appearances ??
		0;
	const providers =
		snapshot?.providers.map((p) => ({
			name: p.name,
			collected: p.collected,
			analysed: p.analysed,
			pending: p.pending,
			rate: rate(p.mentioned, p.analysed),
		})) ??
		(data.perModelVisibility ?? []).map((p) => ({
			name: p.model,
			collected: null,
			analysed: p.responseCount,
			pending: null,
			rate: `${p.mentionRate}%`,
		}));
	const questions =
		snapshot?.questions.map((p) => ({
			prompt: p.prompt,
			collected: p.collected,
			analysed: p.analysed,
			rate: rate(p.mentioned, p.analysed),
		})) ??
		(data.questionBreakdown ?? []).map((p) => ({
			prompt: p.prompt,
			collected: null,
			analysed: p.responseCount,
			rate: `${p.mentionRate}%`,
		}));
	const competitors =
		snapshot?.competitors ??
		data.mentionRates
			.filter((p) => !p.isBrand)
			.slice(0, 6)
			.map((p) => ({ name: p.name, count: p.appearances }));
	const evidence =
		snapshot?.evidence ??
		(data.verbatimQuotes ?? []).slice(0, 3).map((q) => ({
			model: q.model,
			text: q.text,
			ref: "历史摘录",
			prompt: "",
			time: "",
		}));
	const sources =
		snapshot?.sources ??
		(data.sourcesIntelligence ?? [])
			.slice(0, 8)
			.map((s) => ({ domain: s.domain, count: s.citationCount }));
	const sourceCount =
		snapshot?.sourceCount ??
		(data.sourcesIntelligence ?? []).reduce(
			(sum, source) => sum + source.citationCount,
			0,
		);
	const remainingSources =
		sourceCount - sources.reduce((sum, source) => sum + source.count, 0);
	const records = snapshot?.records ?? [];
	const recordPages = Array.from(
		{ length: Math.ceil(records.length / 20) },
		(_, i) => records.slice(i * 20, i * 20 + 20),
	);
	const recommendations = data.recommendations?.slice(0, 3) ?? [];

	return (
		<main data-report-template="jianke" className={styles.report}>
			<section className={styles.page}>
				<header className={styles.header}>
					<strong>◉ 秘蜂赢客</strong>
					<span>AI 可见度报告 · 数据快照</span>
					<time>
						{date(snapshot?.generatedAt ?? data.generatedAt)} 北京时间
					</time>
				</header>
				<p className={styles.eyebrow}>ONEGLANSE · 实际采集记录</p>
				<h1>{data.brand.name}</h1>
				<p className={styles.muted}>
					登记域名：{data.brand.domain || "未登记"}
					<br />
					{snapshot?.rangeStart
						? `采集时间：${date(snapshot.rangeStart)} 至 ${date(snapshot.rangeEnd)}（北京时间）`
						: "统计范围：报告生成时保存的已分析回复"}
				</p>
				<div className={styles.summary}>
					<span className={styles.kicker}>这批数据告诉我们什么</span>
					<h2>
						已分析的 {analysed} 条回复中，
						<em>
							{mentioned} 条提及{data.brand.name}
						</em>
						。
					</h2>
					<p>
						品牌提及率为 <strong>{rate(mentioned, analysed)}</strong>。
						{snapshot
							? `共采集 ${snapshot.collected} 条回复，其中 ${snapshot.pending} 条待分析；待分析记录不计入提及率。`
							: "历史报告未记录未分析回复的数量，以下仅展示已保存的统计。"}
					</p>
				</div>
				<div className={styles.metrics}>
					<div>
						<span>{snapshot ? "采集回复" : "覆盖平台"}</span>
						<strong>
							{snapshot?.collected ?? providers.length}
							<small> {snapshot ? "条" : "个"}</small>
						</strong>
						<p>
							{questions.length} 个问题 · {providers.length} 个平台
						</p>
					</div>
					<div>
						<span>已分析回复</span>
						<strong>
							{analysed}
							<small> 条</small>
						</strong>
						<p>
							{snapshot
								? `${snapshot.pending} 条待分析`
								: "以生成时的分析结果为准"}
						</p>
					</div>
					<div>
						<span>品牌提及率</span>
						<strong>
							{analysed ? Math.round((mentioned / analysed) * 1000) / 10 : "—"}
							<small>{analysed ? "%" : ""}</small>
						</strong>
						<p>
							{mentioned} / {analysed} 条已分析回复
						</p>
					</div>
				</div>
				<h3>按问题分别统计</h3>
				<div className={styles.tableWrap}>
					<table>
						<thead>
							<tr>
								<th>问题</th>
								<th>采集</th>
								<th>已分析</th>
								<th>提及率</th>
							</tr>
						</thead>
						<tbody>
							{questions.map((q) => (
								<tr key={q.prompt}>
									<td className={styles.question}>{q.prompt}</td>
									<td>{q.collected ?? "—"}</td>
									<td>{q.analysed}</td>
									<td>{q.rate}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<p className={styles.note}>
					本报告是生成时的数据快照。不同问题、地区和采样次数需要分别比较；这批样本不能直接外推为全市场排名或效果承诺。
				</p>
			</section>

			<section className={styles.page}>
				<p className={styles.eyebrow}>01 · 平台与同批对照</p>
				<h2>哪些平台在这批回复中提到了品牌</h2>
				<p className={styles.intro}>
					各平台独立计算提及率；平台样本数不同，待分析记录保持未知。
				</p>
				<div className={styles.tableWrap}>
					<table>
						<thead>
							<tr>
								<th>平台</th>
								<th>采集</th>
								<th>已分析</th>
								<th>提及率</th>
								<th>待分析</th>
							</tr>
						</thead>
						<tbody>
							{providers.map((p) => (
								<tr key={p.name}>
									<td>{modelName(p.name)}</td>
									<td>{p.collected ?? "—"}</td>
									<td>{p.analysed}</td>
									<td className={styles.accent}>{p.rate}</td>
									<td>{p.pending ?? "—"}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<h3>同一批回复中的常见名称</h3>
				<p className={styles.muted}>
					按已分析回复中的出现次数展示，同一回复内只计一次。出现频次不代表机构质量或全市排名。
				</p>
				<div className={styles.card}>
					{competitors.map((c) => (
						<div className={styles.barRow} key={c.name}>
							<span>{c.name}</span>
							<div className={styles.track}>
								<i
									style={{
										width: `${analysed ? Math.min(100, (c.count / analysed) * 100) : 0}%`,
									}}
								/>
							</div>
							<strong>
								{c.count} / {analysed}
							</strong>
						</div>
					))}
					<div className={`${styles.barRow} ${styles.brandRow}`}>
						<span>{data.brand.name}</span>
						<div className={styles.track}>
							<i
								style={{
									width: `${analysed ? (mentioned / analysed) * 100 : 0}%`,
								}}
							/>
						</div>
						<strong>
							{mentioned} / {analysed}
						</strong>
					</div>
				</div>
				<p className={styles.note}>
					名称来自已保存的分析记录，仅合并空格和大小写差异；不同名称可能属于同一机构，未经确认的别名不推断合并。
				</p>
			</section>

			<section className={styles.page}>
				<p className={styles.eyebrow}>02 · 品牌出现的原文证据</p>
				<h2>回到 AI 当时的具体回答</h2>
				<p className={styles.intro}>
					以下最多展示 3 条品牌相关原文摘录，用于理解 AI
					当时如何表述品牌。回答中的服务、技术、门店信息仍需核实。
				</p>
				{evidence.length ? (
					evidence.map((e, index) => (
						<article className={styles.evidence} key={`${e.ref}-${index}`}>
							<div className={styles.row}>
								<span className={styles.tag}>
									{e.ref} · {modelName(e.model)}
								</span>
								{e.time ? <time>{date(e.time)}</time> : null}
							</div>
							<blockquote>{e.text}</blockquote>
							{e.prompt ? <p>{e.prompt}</p> : null}
						</article>
					))
				) : (
					<div className={styles.card}>
						<p>本次报告没有可展示的品牌原文摘录。</p>
					</div>
				)}
				<div className={styles.notice}>
					<h3>提及与推荐分别理解</h3>
					<p>
						提及统计依据已保存的品牌分析；出现品牌名称不等于主动推荐。门店归属、同名品牌及推荐标签如有疑问，应结合原文复核。
					</p>
				</div>
				{snapshot?.pending ? (
					<div className={styles.notice}>
						<h3>还有 {snapshot.pending} 条回复待分析</h3>
						<p>
							这些记录仅计入采集量、来源量和附录，不计为未提及。分析完成后可重新生成报告。
						</p>
					</div>
				) : null}
			</section>

			<section className={styles.page}>
				<p className={styles.eyebrow}>03 · 抓取到的信息来源</p>
				<h2>来源列表共 {sourceCount} 条记录</h2>
				<p className={styles.intro}>
					{snapshot
						? `覆盖本次 ${snapshot.collected} 条回复，按完整 URL 去重后为 ${snapshot.uniqueSourceUrls} 个地址，共 ${snapshot.sourceDomains} 个域名。`
						: "以下展示历史报告保存的来源域名及出现次数。"}
				</p>
				<div className={styles.tableWrap}>
					<table>
						<thead>
							<tr>
								<th>来源域名</th>
								<th>记录数</th>
								<th>占来源记录</th>
							</tr>
						</thead>
						<tbody>
							{sources.map((s) => (
								<tr key={s.domain}>
									<td className={styles.question}>{s.domain}</td>
									<td>{s.count}</td>
									<td>{rate(s.count, sourceCount)}</td>
								</tr>
							))}
							{remainingSources > 0 ? (
								<tr>
									<td>其余来源</td>
									<td>{remainingSources}</td>
									<td>{rate(remainingSources, sourceCount)}</td>
								</tr>
							) : null}
						</tbody>
					</table>
				</div>
				{snapshot && data.brand.domain ? (
					<div className={styles.summary}>
						<span className={styles.kicker}>登记域名在这批来源中的情况</span>
						<h2>
							{data.brand.domain}：
							<em>{snapshot.registeredDomainSources} 条来源记录</em>
						</h2>
						<p>
							仅统计这批回复保存的来源地址，不代表全网引用情况。登记域名是否为品牌实际官网，需要自行确认。
						</p>
					</div>
				) : null}
				<p className={styles.note}>
					来源列表项不等同于已经人工核实的正文引文。同一地址在不同回复中会重复计数；来源可能涉及竞品或行业内容，不能全部归因于当前品牌。
				</p>
			</section>

			<section className={styles.page}>
				<p className={styles.eyebrow}>04 · 下一步与统计方法</p>
				<h2>先补齐和复核，再比较变化</h2>
				{recommendations.length ? (
					recommendations.map((r, index) => (
						<article className={styles.action} key={`${r.title}-${index}`}>
							<span>{String(index + 1).padStart(2, "0")}</span>
							<div>
								<h3>{r.title}</h3>
								<p>{r.action}</p>
								<p>依据：{r.rationale}</p>
								<p>观察指标：{r.kpi}</p>
							</div>
						</article>
					))
				) : (
					<>
						<article className={styles.action}>
							<span>01</span>
							<div>
								<h3>复核品牌与门店信息</h3>
								<p>
									核对回答中的品牌别名、登记域名、地址及联系方式，区分同名信息。
								</p>
							</div>
						</article>
						<article className={styles.action}>
							<span>02</span>
							<div>
								<h3>
									{snapshot?.pending
										? `补齐 ${snapshot.pending} 条待分析记录`
										: "复核原文与分析标签"}
								</h3>
								<p>
									将问题和地区分别统计，确认提及与推荐的判断一致，再生成下一份报告。
								</p>
							</div>
						</article>
						<article className={styles.action}>
							<span>03</span>
							<div>
								<h3>建立一致的复测基线</h3>
								<p>保持问题、地区、平台和采样次数一致，再比较前后变化。</p>
							</div>
						</article>
					</>
				)}
				<div className={styles.method}>
					<h3>统计说明</h3>
					<p>
						提及率 = 已分析且提及品牌的回复数 / 已分析回复数。本次为 {mentioned}
						/{analysed}。未分析记录保持未知，不填零、不参与提及率。
					</p>
					<p>
						不同采集轮次保留为独立样本。原文摘录和来源信息来自本次报告保存的数据，不构成对回答内容真实性的背书。
					</p>
					<p>
						所有时间均为北京时间（UTC+8）。生成时间：
						{date(snapshot?.generatedAt ?? data.generatedAt)}。分享页与 PDF
						使用同一份快照；后续采集不会改变已生成的报告。
					</p>
					{data.unavailableSections?.length ? (
						<p>本次部分自动解读未能生成，报告保留已取得的统计与基础建议。</p>
					) : null}
				</div>
			</section>

			{recordPages.length
				? recordPages.map((page, index) => (
						<section
							className={`${styles.page} ${styles.appendix}`}
							key={page[0]?.ref}
						>
							<p className={styles.eyebrow}>
								附录 · 采集记录索引{" "}
								{recordPages.length > 1
									? `${index + 1}/${recordPages.length}`
									: ""}
							</p>
							<h2>{records.length} 条回复的核对清单</h2>
							<p className={styles.intro}>
								“未提及”仅用于已有分析的记录；“待分析”保持未知。编号与本次快照对应。
							</p>
							<div className={styles.tableWrap}>
								<table>
									<thead>
										<tr>
											<th>编号</th>
											<th>平台</th>
											<th>采集时间（北京时间）</th>
											<th>品牌状态</th>
											<th>来源数</th>
										</tr>
									</thead>
									<tbody>
										{page.map((r) => (
											<tr key={r.ref}>
												<td>{r.ref}</td>
												<td>{modelName(r.model)}</td>
												<td>{date(r.time)}</td>
												<td
													className={
														r.status === "mentioned" ? styles.accent : undefined
													}
												>
													{r.status === "mentioned"
														? "提及"
														: r.status === "pending"
															? "待分析"
															: "未提及"}
												</td>
												<td>{r.sources}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</section>
					))
				: null}
		</main>
	);
}
