"use client";

import type { AnalysisRecord, ReportData } from "@oneglanse/types";
import {
	ArrowUpRight,
	ChartNoAxesCombined,
	Globe,
	MessageSquare,
	ScanEye,
	ShieldAlert,
	Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { summarizeResponses } from "../_utils/overview";

type ReportProps = { report: ReportData; locale: "zh-CN" | "en" };
const cardClass =
	"min-w-0 rounded-2xl border border-gray-200/70 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-neutral-950 sm:p-6";
const colors = [
	"bg-violet-500",
	"bg-blue-400",
	"bg-emerald-400",
	"bg-amber-400",
	"bg-sky-400",
];

function Panel({
	title,
	description,
	children,
	className = "",
}: {
	title: string;
	description?: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section className={`${cardClass} ${className}`}>
			<h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
				{title}
			</h3>
			{description && (
				<p className="mt-1.5 text-xs leading-5 text-gray-400">{description}</p>
			)}
			<div className="mt-5">{children}</div>
		</section>
	);
}

export function PanelEmptyState({ text }: { text: string }) {
	return (
		<div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-stone-50/50 px-6 py-8 text-center dark:border-gray-800 dark:bg-neutral-900/40">
			<ChartNoAxesCombined className="size-7 text-gray-300" />
			<p className="max-w-lg text-sm leading-6 text-gray-500">{text}</p>
		</div>
	);
}

export function MentionComparison({
	report,
	locale,
	onlyBrand = false,
}: ReportProps & { onlyBrand?: boolean }) {
	const isZh = locale === "zh-CN";
	const entries = onlyBrand
		? report.mentionRates.filter((entry) => entry.isBrand)
		: report.mentionRates;
	return (
		<Panel
			title={
				onlyBrand
					? isZh
						? "品牌提及"
						: "Brand mentions"
					: isZh
						? "品牌提及对比"
						: "Brand mention comparison"
			}
			description={
				isZh
					? `基于 ${report.totalResponses} 条已分析回答 · 同一回答内每个品牌只计一次`
					: `Across ${report.totalResponses} analyzed responses · Each brand counted once per response`
			}
		>
			{report.totalResponses === 0 || entries.length === 0 ? (
				<PanelEmptyState
					text={isZh ? "暂无品牌提及数据" : "No brand mention data"}
				/>
			) : (
				<div className="space-y-5">
					{entries.map((entry, index) => (
						<div
							key={`${entry.isBrand}-${entry.name}`}
							className="grid grid-cols-[minmax(80px,1fr)_minmax(60px,2fr)_auto] items-center gap-3"
						>
							<div className="flex min-w-0 items-center gap-2">
								<span
									className={`size-2 shrink-0 rounded-full ${entry.isBrand ? colors[0] : colors[(index % 4) + 1]}`}
								/>
								<span className="truncate text-sm" title={entry.name}>
									{entry.name}
								</span>
								{entry.isBrand && (
									<span className="hidden shrink-0 rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-600 sm:inline dark:bg-violet-950">
										{isZh ? "本品牌" : "You"}
									</span>
								)}
							</div>
							<div className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-neutral-800">
								<div
									className={`h-full rounded-full ${entry.isBrand ? colors[0] : colors[(index % 4) + 1]}`}
									style={{
										width: `${Math.min(100, Math.max(0, entry.mentionRate))}%`,
									}}
								/>
							</div>
							<div className="text-right">
								<span className="text-sm font-medium tabular-nums">
									{entry.appearances}
								</span>
								<span className="ml-2 text-xs tabular-nums text-gray-400">
									{entry.mentionRate.toFixed(1)}%
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</Panel>
	);
}

export function AnalysisOverview({
	report,
	records,
	locale,
}: ReportProps & { records: AnalysisRecord[] | null }) {
	const isZh = locale === "zh-CN";
	const brand = report.mentionRates.find((entry) => entry.isBrand);
	const { daily, sentiments } = summarizeResponses(records ?? []);
	const measuredSentiments =
		sentiments.positive + sentiments.neutral + sentiments.negative;
	const noData = isZh ? "暂无数据" : "No data";
	const citations = report.sourcesIntelligence?.reduce(
		(total, source) => total + source.citationCount,
		0,
	);
	const sentimentRows = [
		{
			label: isZh ? "正向" : "Positive",
			count: sentiments.positive,
			color: "bg-emerald-400",
		},
		{
			label: isZh ? "中性" : "Neutral",
			count: sentiments.neutral,
			color: "bg-slate-300",
		},
		{
			label: isZh ? "负向" : "Negative",
			count: sentiments.negative,
			color: "bg-rose-400",
		},
	];
	const stats = [
		{
			label: isZh ? "品牌提及率" : "Mention rate",
			value:
				report.totalResponses && brand
					? `${brand.mentionRate.toFixed(1)}%`
					: noData,
			note: isZh
				? `${brand?.appearances ?? 0} 条提及 / ${report.totalResponses} 条已分析回答`
				: `${brand?.appearances ?? 0} mentions / ${report.totalResponses} analyzed responses`,
			icon: ScanEye,
			color: "bg-violet-50 text-violet-500 dark:bg-violet-950/40",
			progress: brand?.mentionRate,
		},
		{
			label: isZh ? "品牌提及" : "Brand mentions",
			value: report.totalResponses ? (brand?.appearances ?? noData) : noData,
			note: isZh
				? "按已分析回答计数，同一回答只计一次"
				: "Each analyzed response is counted once",
			icon: MessageSquare,
			color: "bg-blue-50 text-blue-500 dark:bg-blue-950/40",
		},
		{
			label: isZh ? "来源记录" : "Source records",
			value: citations || noData,
			note: isZh ? "已保存的有效引用来源记录" : "Saved citation source records",
			icon: Globe,
			color: "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40",
		},
		{
			label: isZh ? "负向提及" : "Negative mentions",
			value: measuredSentiments ? sentiments.negative : noData,
			note:
				records === null
					? isZh
						? "历史报告未保存逐条情感标签"
						: "Sentiment labels are not saved in reports"
					: isZh
						? "基于已提及品牌的回答情感评分"
						: "Based on sentiment in brand mentions",
			icon: ShieldAlert,
			color: "bg-amber-50 text-amber-500 dark:bg-amber-950/40",
		},
	];
	return (
		<>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{stats.map(({ label, value, note, icon: Icon, color, progress }) => (
					<section key={label} className={cardClass}>
						<div className="flex items-center justify-between">
							<h3 className="text-xs font-medium text-gray-500">{label}</h3>
							<span
								className={`flex size-8 items-center justify-center rounded-xl ${color}`}
							>
								<Icon className="size-4" />
							</span>
						</div>
						<p
							className={`mt-3 font-semibold tracking-tight tabular-nums ${value === noData ? "text-2xl text-gray-500 dark:text-gray-400" : "text-3xl text-gray-950 dark:text-white"}`}
						>
							{value}
						</p>
						<p className="mt-3 min-h-8 text-[11px] leading-4 text-gray-400">
							{note}
						</p>
						<div className="mt-3 h-1 rounded-full bg-stone-100 dark:bg-neutral-800">
							{progress !== undefined && report.totalResponses > 0 && (
								<div
									className="h-full rounded-full bg-violet-500"
									style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
								/>
							)}
						</div>
					</section>
				))}
			</div>
			<div className="grid gap-5 lg:grid-cols-[1.65fr_1fr]">
				<Panel
					title={isZh ? "每日品牌提及率" : "Daily brand mention rate"}
					description={
						isZh
							? "按采集日期统计 · 仅显示有样本的日期（北京时间）"
							: "By collection date · Dates with samples only (Beijing time)"
					}
				>
					{daily.length === 0 ? (
						<PanelEmptyState
							text={
								isZh
									? "暂无可绘制的逐日已分析回答"
									: "No daily analyzed responses available"
							}
						/>
					) : (
						<div className="overflow-x-auto">
							<div
								className="flex h-44 min-w-full items-end gap-4 border-b border-gray-100 px-2 pt-6 dark:border-gray-800"
								style={{ minWidth: daily.length * 48 }}
							>
								{daily.map((day) => (
									<div
										key={day.date}
										className="flex h-full min-w-8 flex-1 flex-col items-center justify-end gap-2"
										title={`${day.date}: ${day.mentions}/${day.total}`}
									>
										<span className="text-[10px] tabular-nums text-violet-500">
											{day.rate.toFixed(0)}%
										</span>
										<div
											className="w-full max-w-10 rounded-t-md bg-violet-400/80"
											style={{ height: `${day.rate}%`, minHeight: 2 }}
										/>
										<span className="whitespace-nowrap pb-2 text-[10px] text-gray-400">
											{day.date.slice(5)}
										</span>
									</div>
								))}
							</div>
						</div>
					)}
				</Panel>
				<Panel
					title={isZh ? "情感分布" : "Sentiment distribution"}
					description={
						isZh
							? `共 ${brand?.appearances ?? 0} 条品牌提及`
							: `${brand?.appearances ?? 0} brand mentions`
					}
				>
					<div className="mb-5 flex h-3 overflow-hidden rounded-full bg-stone-100 dark:bg-neutral-800">
						{measuredSentiments > 0 &&
							sentimentRows.map((row) => (
								<div
									key={row.label}
									className={row.color}
									style={{
										width: `${(row.count / measuredSentiments) * 100}%`,
									}}
								/>
							))}
					</div>
					{measuredSentiments ? (
						<div className="space-y-3">
							{sentimentRows.map((row) => (
								<div
									key={row.label}
									className="flex items-center gap-2 text-xs"
								>
									<span className={`size-2 rounded-full ${row.color}`} />
									<span className="text-gray-500">{row.label}</span>
									<span className="ml-auto tabular-nums">{row.count}</span>
									<span className="w-12 text-right tabular-nums text-gray-400">
										{Math.round((row.count / measuredSentiments) * 100)}%
									</span>
								</div>
							))}
						</div>
					) : (
						<div className="py-5 text-center text-sm text-gray-400">
							{noData}
						</div>
					)}
					<p className="mt-5 border-t border-gray-100 pt-4 text-[11px] leading-5 text-gray-400 dark:border-gray-800">
						{records === null
							? isZh
								? "报告未保存逐条情感标签和完整共现词统计"
								: "Reports do not store individual sentiment labels"
							: isZh
								? `正向 ≥ 60 · 中性 41–59 · 负向 ≤ 40${sentiments.unknown ? ` · ${sentiments.unknown} 条未评分` : ""}`
								: `Positive ≥ 60 · Neutral 41–59 · Negative ≤ 40${sentiments.unknown ? ` · ${sentiments.unknown} unscored` : ""}`}
					</p>
				</Panel>
			</div>
			<div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
				<Panel
					title={isZh ? "本期总结" : "Period summary"}
					description={
						records === null
							? isZh
								? "历史报告快照"
								: "Historical snapshot"
							: isZh
								? "基于当前筛选范围的采集结果"
								: "Based on the current filters"
					}
				>
					<ul className="space-y-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
						{[
							isZh
								? `${report.totalResponses} 条回答已分析，${brand?.appearances ?? 0} 条提及品牌。`
								: `${report.totalResponses} analyzed responses, ${brand?.appearances ?? 0} brand mentions.`,
							isZh
								? `品牌提及率 ${report.totalResponses && brand ? `${brand.mentionRate.toFixed(1)}%` : "暂无数据"}，未采集平台不填入数据。`
								: `Brand mention rate: ${report.totalResponses && brand ? `${brand.mentionRate.toFixed(1)}%` : "no data"}. Only collected samples are included.`,
							records === null
								? isZh
									? "历史报告仅保存汇总，无法按时间或引擎筛选。"
									: "Historical summaries cannot be filtered by time or engine."
								: isZh
									? `覆盖 ${new Set(records.map((record) => record.model_provider)).size} 个引擎，${new Set(records.map((record) => record.prompt_id)).size} 条提问。`
									: `Across ${new Set(records.map((record) => record.model_provider)).size} engines and ${new Set(records.map((record) => record.prompt_id)).size} prompts.`,
						].map((line) => (
							<li key={line} className="flex items-start gap-3">
								<span className="mt-2 size-1.5 shrink-0 rounded-full bg-violet-400" />
								{line}
							</li>
						))}
					</ul>
				</Panel>
				<MentionComparison report={report} locale={locale} />
			</div>
			{records === null && (
				<p className="flex items-center gap-2 text-xs text-gray-400">
					<span className="size-1.5 rounded-full bg-emerald-400" />
					{isZh ? "历史报告快照 · 生成于" : "Historical snapshot · Generated"}{" "}
					{new Date(report.generatedAt).toLocaleString(
						isZh ? "zh-CN" : "en-US",
					)}
				</p>
			)}
		</>
	);
}

export function ReportSources({ report, locale }: ReportProps) {
	const isZh = locale === "zh-CN";
	const sources = report.sourcesIntelligence ?? [];
	return (
		<Panel
			title={isZh ? "引用来源" : "Citation sources"}
			description={
				isZh
					? "AI 回答中保存的来源域名、引用次数与引用引擎"
					: "Saved source domains, citation counts and engines"
			}
		>
			{sources.length === 0 ? (
				<PanelEmptyState
					text={isZh ? "暂无有效引用来源记录" : "No citation sources available"}
				/>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead className="border-b border-gray-100 text-xs text-gray-400 dark:border-gray-800">
							<tr>
								<th className="pb-3 font-medium">
									{isZh ? "来源域名" : "Source"}
								</th>
								<th className="px-5 pb-3 font-medium">
									{isZh ? "引用次数" : "Citations"}
								</th>
								<th className="pb-3 font-medium">
									{isZh ? "引擎" : "Engines"}
								</th>
							</tr>
						</thead>
						<tbody>
							{sources.map((source) => (
								<tr
									key={source.domain}
									className="border-b border-gray-100 last:border-0 dark:border-gray-800"
								>
									<td className="py-4 font-medium">{source.domain}</td>
									<td className="px-5 py-4 tabular-nums">
										{source.citationCount}
									</td>
									<td className="py-4 text-xs text-gray-500">
										{source.models.join(" · ")}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</Panel>
	);
}

export function Recommendations({
	report,
	locale,
	workspaceId,
}: ReportProps & { workspaceId: string }) {
	const isZh = locale === "zh-CN";
	const recommendations = report.recommendations ?? [];
	return (
		<Panel
			title={isZh ? "优化建议" : "Recommendations"}
			description={
				isZh
					? "根据报告中的品牌表现，确定下一步行动"
					: "Actions grounded in the brand performance in this report"
			}
		>
			{recommendations.length === 0 ? (
				<>
					<PanelEmptyState
						text={
							isZh
								? "当前数据尚未包含优化建议。前往报告页生成报告，或选择一份已有建议的历史报告。"
								: "No recommendations in this data. Generate a report or select a historical report with recommendations."
						}
					/>
					<Link
						href={`/reports?workspace=${workspaceId}`}
						className="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-950 px-4 py-2.5 text-xs font-medium text-white dark:bg-white dark:text-gray-950"
					>
						<Sparkles className="size-3.5" />
						{isZh ? "前往报告" : "Go to reports"}
						<ArrowUpRight className="size-3.5" />
					</Link>
				</>
			) : (
				<div className="space-y-4">
					{recommendations.map((item) => (
						<article
							key={item.title}
							className="rounded-xl border border-gray-100 bg-stone-50/50 p-5 dark:border-gray-800 dark:bg-neutral-900"
						>
							<div className="flex items-start gap-3">
								<span className="shrink-0 rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">
									{isZh
										? { high: "高优先级", medium: "中优先级", low: "低优先级" }[
												item.priority
											]
										: item.priority}
								</span>
								<h4 className="text-sm font-semibold leading-6">
									{item.title}
								</h4>
							</div>
							<p className="mt-3 text-sm leading-6 text-gray-500">
								{item.rationale}
							</p>
							<p className="mt-3 text-sm leading-6">{item.action}</p>
							<p className="mt-4 border-t border-gray-200/60 pt-3 text-xs leading-5 text-gray-500 dark:border-gray-800">
								{isZh ? "衡量指标：" : "Measure: "}
								{item.kpi}
							</p>
						</article>
					))}
				</div>
			)}
		</Panel>
	);
}
