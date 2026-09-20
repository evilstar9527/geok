import { sitePath } from "../lib/paths.mjs";
export default function ReportCard({ report, lang }) {
	const zh = lang === "zh";
	const percent = (value) =>
		value === null ? (zh ? "待分析" : "Pending") : `${value}%`;
	const e = report.evidence;
	return (
		<div
			className="jk-hero-37"
			aria-label={zh ? "真实报告数据" : "Real report data"}
		>
			<div className="jk-hero-38">
				<span className="jk-hero-39" style={{ animation: "none" }} />
				<span className="jk-hero-40">
					{zh ? "AI 可见度报告" : "AI visibility report"}
				</span>
				<span className="jk-hero-41">
					{zh ? "真实报告数据" : "Real report data"}
				</span>
			</div>
			<div className="jk-hero-42">
				{zh ? "监测品牌" : "Brand"} · {report.brand}
			</div>
			<div className="jk-hero-43">
				{e?.prompt || (zh ? "暂无问题摘录" : "No question excerpt")}
			</div>
			<div className="jk-hero-44">
				<div className="jk-hero-45">
					{e
						? `${e.model} · ${zh ? "原文摘录" : "Original excerpt"} · ${e.ref}`
						: zh
							? "暂无原文摘录"
							: "No excerpt available"}
				</div>
				{e && (
					<>
						<p className="jk-hero-46">
							{e.text
								.replace(/\u200b/g, "")
								.split(/\*\*(.*?)\*\*/g)
								.map((text, i) =>
									// biome-ignore lint/suspicious/noArrayIndexKey: These are fixed text segments of one immutable report excerpt.
									i % 2 ? <strong key={i}>{text}</strong> : text,
								)}
						</p>
						<div className="jk-hero-61">{e.time} (UTC+8)</div>
					</>
				)}
				<div className="jk-hero-50">
					<span className="jk-hero-61">
						{zh ? "报告来源域名（全样本）" : "Source domains (all samples)"}
					</span>
					{report.sources.map((domain) => (
						<span className="jk-hero-51" key={domain}>
							{domain}
						</span>
					))}
					{!report.sources.length && (
						<span className="jk-hero-61">
							{zh ? "暂无来源数据" : "No sources available"}
						</span>
					)}
				</div>
			</div>
			<div className="jk-hero-52">
				<div>
					<div className="jk-hero-53">{percent(report.percent)}</div>
					<div className="jk-hero-54">
						{zh ? "本报告提及率" : "Report mention rate"}
					</div>
				</div>
				<div className="jk-hero-55">
					{report.providers.map((p) => (
						<div
							className="jk-hero-56"
							key={p.name}
							title={`${p.mentioned} / ${p.analysed} ${zh ? "条已分析回复" : "analysed responses"}`}
						>
							<span className="jk-hero-57">{p.name}</span>
							<span className="jk-hero-58" aria-hidden="true">
								<span
									className="jk-hero-59"
									style={{ background: "#5FC8E8", width: `${p.percent ?? 0}%` }}
								/>
							</span>
							<span className="jk-hero-60" style={{ color: "#5FC8E8" }}>
								{percent(p.percent)}
							</span>
						</div>
					))}
				</div>
			</div>
			<div className="jk-hero-61">
				{zh
					? `${report.mentioned} / ${report.analysed} 条已分析回复提及品牌；${report.pending} 条待分析不计入。`
					: `${report.mentioned} / ${report.analysed} analysed responses mention the brand; ${report.pending} pending excluded.`}
				<br />
				{report.rangeStart && (
					<>
						{zh ? "采集" : "Collected"}: {report.rangeStart} – {report.rangeEnd}{" "}
						(UTC+8)
						<br />
					</>
				)}
				{zh ? "报告生成" : "Report generated"}: {report.generatedAt} (UTC+8)
				<br />
				<a
					href={sitePath(report.url)}
					target="_blank"
					rel="noopener noreferrer"
					style={{ color: "#5FC8E8" }}
				>
					{zh ? "查看完整报告 ↗" : "View full report ↗"}
				</a>
			</div>
		</div>
	);
}
