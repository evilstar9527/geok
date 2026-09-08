"use client";

import type {
	ReportContactInfo,
	ReportData,
	ReportGap,
	ReportGapDirection,
	ReportMentionEntry,
	ReportModelEntry,
	ReportQuestionBreakdown,
	ReportQuote,
	ReportRankBucket,
	ReportRecommendation,
	ReportRiskCounts,
	ReportSentimentBucket,
	ReportSourceChannel,
	ReportSourceEntry,
	ReportThemeCount,
} from "@oneglanse/types";
import { AlertTriangle, Minus, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

const BRAND_COLOR = "#E15759";
const COMPETITOR_COLOR = "#cbd5e1";
const REC_COLOR = "#4E79A7";

/** Qualitative palette for share-of-voice donuts. */
const PIE_COLORS = [
	"#E15759",
	"#4E79A7",
	"#F28E2B",
	"#76B7B2",
	"#59A14F",
	"#EDC948",
	"#B07AA1",
	"#9C755F",
];

const CARD =
	"rounded-2xl border border-gray-200/70 bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.25)]";

/** Headroom above the tallest bar so value labels never clip. */
function axisMax(values: number[]): number {
	const peak = Math.max(...values, 0);
	if (peak <= 0) return 10;
	return Math.min(100, Math.ceil((peak * 1.25) / 10) * 10);
}

const TOOLTIP_STYLE = {
	borderRadius: 12,
	border: "1px solid rgba(15,23,42,0.08)",
	boxShadow: "0 12px 32px -18px rgba(15,23,42,0.35)",
	fontSize: 12,
	padding: "6px 10px",
} as const;

function formatDate(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return date.toLocaleDateString("zh-CN", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

/** Keeps long brand / model names from blowing out an axis tick. */
function truncate(value: string, max: number): string {
	return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

const GAP_LABEL: Record<ReportGap["key"], string> = {
	mention: "提及率",
	recommendation: "推荐率",
	rank: "平均排名",
	sentiment: "口碑得分",
	risk: "关键风险",
};

const PRICING_LABEL: Record<string, string> = {
	premium: "高端",
	mid_range: "中端",
	budget: "经济实惠",
	free: "免费",
	not_mentioned: "未提及",
};

const PRIORITY_LABEL: Record<ReportRecommendation["priority"], string> = {
	high: "高优先级",
	medium: "中优先级",
	low: "低优先级",
};

const PRIORITY_STYLE: Record<ReportRecommendation["priority"], string> = {
	high: "border-red-200 bg-red-50 text-red-600",
	medium: "border-amber-200 bg-amber-50 text-amber-600",
	low: "border-gray-200 bg-gray-50 text-gray-500",
};

function formatValue(key: ReportGap["key"], value: number | null): string {
	if (value === null) return "—";
	if (key === "rank") return `#${value}`;
	if (key === "risk") return `${value} 个`;
	if (key === "sentiment") return `${value}`;
	return `${value}%`;
}

function gapDirection(gap: ReportGap): ReportGapDirection {
	if (gap.direction) return gap.direction;
	// Reports stored before `direction` existed: derive it from the numbers.
	if (gap.key === "risk") return (gap.brandValue ?? 0) > 0 ? "behind" : "ahead";
	if (gap.brandValue === null || gap.competitorValue === null) return "neutral";
	const delta = gap.brandValue - gap.competitorValue;
	if (delta === 0) return "tied";
	// Rank is inverted: a smaller number is a better position.
	const brandWins = gap.key === "rank" ? delta < 0 : delta > 0;
	return brandWins ? "ahead" : "behind";
}

/**
 * Plain numeric description, used only when narrative generation failed.
 * States what the numbers are without judging beyond the computed direction.
 */
function fallbackHeadline(
	gap: ReportGap,
	direction: ReportGapDirection,
): string {
	const label = GAP_LABEL[gap.key];
	if (gap.key === "risk") {
		const count = gap.brandValue ?? 0;
		return count > 0 ? `检测到 ${count} 个关键风险信号` : "暂无关键风险信号";
	}
	const brand = formatValue(gap.key, gap.brandValue);
	const rival = formatValue(gap.key, gap.competitorValue);
	const rivalName = gap.competitorName || "竞品";
	if (direction === "tied") return `${label}与「${rivalName}」持平（${brand}）`;
	if (direction === "ahead")
		return `${label}领先「${rivalName}」：${brand} vs ${rival}`;
	if (direction === "behind")
		return `${label}落后「${rivalName}」：${brand} vs ${rival}`;
	return `${label}：${brand}`;
}

const DIRECTION_STYLE: Record<
	ReportGapDirection,
	{
		icon: typeof AlertTriangle;
		iconColor: string;
		textColor: string;
		badge: string;
		label: string;
	}
> = {
	ahead: {
		icon: TrendingUp,
		iconColor: "text-emerald-500",
		textColor: "text-emerald-700",
		badge: "border-emerald-200 bg-emerald-50 text-emerald-600",
		label: "领先",
	},
	tied: {
		icon: Minus,
		iconColor: "text-gray-400",
		textColor: "text-gray-800",
		badge: "border-gray-200 bg-gray-50 text-gray-500",
		label: "持平",
	},
	behind: {
		icon: AlertTriangle,
		iconColor: "text-red-500",
		textColor: "text-red-600",
		badge: "border-red-200 bg-red-50 text-red-600",
		label: "落后",
	},
	neutral: {
		icon: Minus,
		iconColor: "text-gray-400",
		textColor: "text-gray-800",
		badge: "border-gray-200 bg-gray-50 text-gray-500",
		label: "—",
	},
};

function StatPill({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl border border-gray-200/70 bg-white/70 px-4 py-3">
			<p className="text-[11px] text-gray-500">{label}</p>
			<p className="mt-0.5 text-xl font-bold tabular-nums text-gray-900">
				{value}
			</p>
		</div>
	);
}

/** Angled x-axis tick so Chinese brand names stay readable when crowded. */
function AngledTick({
	x,
	y,
	payload,
}: {
	x?: number;
	y?: number;
	payload?: { value?: string };
}) {
	return (
		<g transform={`translate(${x ?? 0},${y ?? 0})`}>
			<text
				x={0}
				y={0}
				dy={10}
				textAnchor="end"
				transform="rotate(-35)"
				fill="#667085"
				fontSize={11}
			>
				{truncate(String(payload?.value ?? ""), 10)}
			</text>
		</g>
	);
}

/** Vertical column chart: one bar per brand, brand highlighted in red. */
function MentionChart({
	mentionRates,
	totalResponses,
}: {
	mentionRates: ReportMentionEntry[];
	totalResponses: number;
}) {
	// Keep the chart legible: top competitors plus the brand itself, always.
	const chartData = useMemo(() => {
		const top = mentionRates.slice(0, 8);
		if (top.some((entry) => entry.isBrand)) return top;
		const brand = mentionRates.find((entry) => entry.isBrand);
		return brand ? [...top.slice(0, 7), brand] : top;
	}, [mentionRates]);

	const max = axisMax(chartData.map((entry) => entry.mentionRate));

	return (
		<section className="mt-10">
			<h2 className="text-lg font-bold tracking-tight">AI 模型提及率对比</h2>
			<p className="mt-1 text-xs text-gray-500">
				在被分析的 {totalResponses} 条回答中，各品牌被提及的比例
			</p>

			<div className={`mt-4 p-5 ${CARD}`}>
				<div className="mb-4 flex items-center gap-4 text-[11px] text-gray-500">
					<span className="inline-flex items-center gap-1.5">
						<span
							className="h-2.5 w-2.5 rounded-sm"
							style={{ backgroundColor: BRAND_COLOR }}
						/>
						您的品牌
					</span>
					<span className="inline-flex items-center gap-1.5">
						<span
							className="h-2.5 w-2.5 rounded-sm"
							style={{ backgroundColor: COMPETITOR_COLOR }}
						/>
						竞品
					</span>
				</div>

				<div className="h-[300px] w-full">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={chartData}
							margin={{ top: 24, right: 8, bottom: 56, left: 0 }}
							barCategoryGap="28%"
						>
							<CartesianGrid
								strokeDasharray="3 3"
								vertical={false}
								opacity={0.35}
							/>
							<XAxis
								dataKey="name"
								interval={0}
								axisLine={false}
								tickLine={false}
								height={56}
								tick={<AngledTick />}
							/>
							<YAxis
								domain={[0, max]}
								tickFormatter={(value: number) => `${value}%`}
								tick={{ fontSize: 11, fill: "#94a3b8" }}
								axisLine={false}
								tickLine={false}
								width={40}
							/>
							<Tooltip
								formatter={(value: number) => [`${value}%`, "提及率"]}
								cursor={{ fill: "rgba(15,23,42,0.04)" }}
								contentStyle={TOOLTIP_STYLE}
							/>
							<Bar
								dataKey="mentionRate"
								radius={[6, 6, 0, 0]}
								maxBarSize={48}
								isAnimationActive={false}
								label={{
									position: "top",
									fill: "#475569",
									fontSize: 11,
									formatter: (value: number) => `${value}%`,
								}}
							>
								{chartData.map((entry) => (
									<Cell
										key={entry.name}
										fill={entry.isBrand ? BRAND_COLOR : COMPETITOR_COLOR}
									/>
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</div>
		</section>
	);
}

const BAR_COLOR: Record<ReportGapDirection, string> = {
	ahead: "#059669",
	tied: "#64748b",
	behind: BRAND_COLOR,
	neutral: "#64748b",
};

function GapBar({
	brandValue,
	competitorValue,
	direction,
}: {
	brandValue: number;
	competitorValue: number;
	direction: ReportGapDirection;
}) {
	const max = Math.max(brandValue, competitorValue, 1);
	const brandW = Math.max(2, (brandValue / max) * 100);
	const competitorW = Math.max(2, (competitorValue / max) * 100);

	return (
		<div className="mt-4 space-y-2">
			<div className="flex items-center gap-2">
				<span className="w-10 shrink-0 text-[11px] text-gray-500">竞品</span>
				<div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
					<div
						className="h-full rounded-full bg-gray-400 transition-all"
						style={{ width: `${competitorW}%` }}
					/>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<span className="w-10 shrink-0 text-[11px] text-gray-500">您</span>
				<div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
					<div
						className="h-full rounded-full transition-all"
						style={{
							width: `${brandW}%`,
							backgroundColor: BAR_COLOR[direction],
						}}
					/>
				</div>
			</div>
		</div>
	);
}

function GapCard({ gap, brandName }: { gap: ReportGap; brandName: string }) {
	const isRank = gap.key === "rank";
	const isRisk = gap.key === "risk";
	const comparable =
		!isRisk &&
		gap.brandValue !== null &&
		gap.competitorValue !== null &&
		!isRank;

	const direction = gapDirection(gap);
	const style = DIRECTION_STYLE[direction];
	const Icon = style.icon;
	const headline = gap.headline?.trim() || fallbackHeadline(gap, direction);

	return (
		<div className={`p-5 ${CARD}`}>
			<div className="flex items-center gap-2">
				<Icon className={`h-4 w-4 ${style.iconColor}`} />
				<h3 className="text-sm font-semibold text-gray-900">
					{GAP_LABEL[gap.key]}
				</h3>
				{isRisk ? null : (
					<span
						className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${style.badge}`}
					>
						{style.label}
					</span>
				)}
			</div>

			<p
				className={`mt-2 text-base font-semibold leading-snug ${style.textColor}`}
			>
				{headline}
			</p>

			{gap.insight ? (
				<p className="mt-1.5 text-xs leading-relaxed text-gray-500">
					{gap.insight}
				</p>
			) : null}

			{isRisk ? (
				<p
					className={`mt-3 text-3xl font-bold tabular-nums ${style.textColor}`}
				>
					{gap.brandValue ?? 0}
					<span className="ml-1 text-sm font-medium text-gray-500">
						个关键风险
					</span>
				</p>
			) : (
				<div className="mt-3 flex items-end gap-6">
					<div>
						<p className="text-[11px] text-gray-500">您（{brandName}）</p>
						<p className={`text-2xl font-bold tabular-nums ${style.textColor}`}>
							{formatValue(gap.key, gap.brandValue)}
						</p>
					</div>
					<div>
						<p className="text-[11px] text-gray-500">
							竞品（{gap.competitorName || "—"}）
						</p>
						<p className="text-2xl font-bold tabular-nums text-gray-800">
							{formatValue(gap.key, gap.competitorValue)}
						</p>
					</div>
				</div>
			)}

			{comparable ? (
				<GapBar
					brandValue={gap.brandValue as number}
					competitorValue={gap.competitorValue as number}
					direction={direction}
				/>
			) : null}
		</div>
	);
}

/** Citation share by domain: donut + ranked list. */
function SourceSection({ sources }: { sources: ReportSourceEntry[] }) {
	const { slices, total } = useMemo(() => {
		const sum = sources.reduce((acc, s) => acc + s.citationCount, 0);
		const top = sources.slice(0, 6);
		const restCount = sources
			.slice(6)
			.reduce((acc, s) => acc + s.citationCount, 0);
		const data = top.map((s) => ({ name: s.domain, value: s.citationCount }));
		if (restCount > 0) data.push({ name: "其他", value: restCount });
		return { slices: data, total: sum };
	}, [sources]);

	return (
		<section className="mt-10">
			<h2 className="text-lg font-bold tracking-tight">信源情报</h2>
			<p className="mt-1 text-xs text-gray-500">
				AI 回答引用最多的媒体来源，是内容投放与公关的优先目标
			</p>

			<div className={`mt-4 grid grid-cols-1 gap-6 p-5 sm:grid-cols-2 ${CARD}`}>
				<div className="relative h-[260px] w-full">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie
								data={slices}
								dataKey="value"
								nameKey="name"
								innerRadius="56%"
								outerRadius="84%"
								startAngle={90}
								endAngle={-270}
								paddingAngle={1.5}
								stroke="#fff"
								strokeWidth={2}
								isAnimationActive={false}
							>
								{slices.map((slice, index) => (
									<Cell
										key={slice.name}
										fill={PIE_COLORS[index % PIE_COLORS.length]}
									/>
								))}
							</Pie>
							<Tooltip
								formatter={(value: number, name: string) => [
									`${value} 次 (${Math.round((value / Math.max(total, 1)) * 100)}%)`,
									name,
								]}
								contentStyle={TOOLTIP_STYLE}
							/>
						</PieChart>
					</ResponsiveContainer>
					<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
						<span className="text-2xl font-bold tabular-nums text-gray-900">
							{total}
						</span>
						<span className="text-[11px] text-gray-500">总引用次数</span>
					</div>
				</div>

				<ol className="flex flex-col justify-center gap-2">
					{slices.map((slice, index) => (
						<li key={slice.name} className="flex items-center gap-2.5 text-sm">
							<span
								className="h-2.5 w-2.5 shrink-0 rounded-sm"
								style={{
									backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
								}}
							/>
							<span className="min-w-0 flex-1 truncate text-gray-800">
								{slice.name}
							</span>
							<span className="shrink-0 tabular-nums text-xs text-gray-500">
								{slice.value} 次 ·{" "}
								{Math.round((slice.value / Math.max(total, 1)) * 100)}%
							</span>
						</li>
					))}
				</ol>
			</div>
		</section>
	);
}

/**
 * Per-model visibility. The donut shows how the sampled answers split across
 * models (shares that legitimately sum to 100%); the columns compare mention
 * and recommendation rates, which are per-model ratios and cannot be a pie.
 */
function ModelSection({
	entries,
	brandName,
}: {
	entries: ReportModelEntry[];
	brandName: string;
}) {
	const totalResponses = useMemo(
		() => entries.reduce((acc, e) => acc + e.responseCount, 0),
		[entries],
	);

	const rateMax = axisMax(
		entries.flatMap((e) => [e.mentionRate, e.recommendationRate]),
	);

	return (
		<section className="mt-10">
			<h2 className="text-lg font-bold tracking-tight">分模型可见度</h2>
			<p className="mt-1 text-xs text-gray-500">
				「{brandName}」在各家大模型中的提及率与推荐率
			</p>

			<div className="mt-4 space-y-4">
				<div className={`p-5 ${CARD}`}>
					<h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
						回答样本分布
					</h3>
					<div className="mt-2 grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
						<div className="relative h-[220px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie
										data={entries}
										dataKey="responseCount"
										nameKey="model"
										innerRadius="56%"
										outerRadius="84%"
										startAngle={90}
										endAngle={-270}
										paddingAngle={1.5}
										stroke="#fff"
										strokeWidth={2}
										isAnimationActive={false}
									>
										{entries.map((entry, index) => (
											<Cell
												key={entry.model}
												fill={PIE_COLORS[index % PIE_COLORS.length]}
											/>
										))}
									</Pie>
									<Tooltip
										formatter={(value: number, name: string) => [
											`${value} 条 (${Math.round((value / Math.max(totalResponses, 1)) * 100)}%)`,
											name,
										]}
										contentStyle={TOOLTIP_STYLE}
									/>
								</PieChart>
							</ResponsiveContainer>
							<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
								<span className="text-2xl font-bold tabular-nums text-gray-900">
									{totalResponses}
								</span>
								<span className="text-[11px] text-gray-500">条回答</span>
							</div>
						</div>

						<ul className="flex flex-col justify-center gap-2">
							{entries.map((entry, index) => (
								<li
									key={entry.model}
									className="flex items-center gap-2.5 text-sm"
								>
									<span
										className="h-2.5 w-2.5 shrink-0 rounded-sm"
										style={{
											backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
										}}
									/>
									<div className="min-w-0 flex-1">
										<p className="truncate text-gray-800">{entry.model}</p>
										<p className="text-[11px] text-gray-400">
											{typeof entry.avgSentiment === "number"
												? `口碑 ${entry.avgSentiment}`
												: ""}
											{entry.avgRank ? ` · 排名 #${entry.avgRank}` : ""}
										</p>
									</div>
									<span className="shrink-0 tabular-nums text-xs text-gray-500">
										{entry.responseCount} 条 ·{" "}
										{Math.round(
											(entry.responseCount / Math.max(totalResponses, 1)) * 100,
										)}
										%
									</span>
								</li>
							))}
						</ul>
					</div>
				</div>

				<div className={`p-5 ${CARD}`}>
					<h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
						提及率 vs 推荐率
					</h3>
					<div className="mt-2 h-[260px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={entries}
								margin={{ top: 16, right: 8, bottom: 40, left: 0 }}
								barCategoryGap="18%"
								barGap={2}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									vertical={false}
									opacity={0.35}
								/>
								<XAxis
									dataKey="model"
									interval={0}
									axisLine={false}
									tickLine={false}
									height={40}
									tick={<AngledTick />}
								/>
								<YAxis
									domain={[0, rateMax]}
									tickFormatter={(value: number) => `${value}%`}
									tick={{ fontSize: 11, fill: "#94a3b8" }}
									axisLine={false}
									tickLine={false}
									width={40}
								/>
								<Tooltip
									formatter={(value: number) => `${value}%`}
									cursor={{ fill: "rgba(15,23,42,0.04)" }}
									contentStyle={TOOLTIP_STYLE}
								/>
								<Legend
									verticalAlign="top"
									align="right"
									height={28}
									iconType="circle"
									iconSize={8}
									formatter={(value: string) => (
										<span style={{ fontSize: 11, color: "#667085" }}>
											{value}
										</span>
									)}
								/>
								<Bar
									dataKey="mentionRate"
									name="提及率"
									fill={BRAND_COLOR}
									radius={[5, 5, 0, 0]}
									maxBarSize={36}
									isAnimationActive={false}
								/>
								<Bar
									dataKey="recommendationRate"
									name="推荐率"
									fill={REC_COLOR}
									radius={[5, 5, 0, 0]}
									maxBarSize={36}
									isAnimationActive={false}
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>
		</section>
	);
}

function RecommendationCard({
	rec,
	index,
}: {
	rec: ReportRecommendation;
	index: number;
}) {
	return (
		<div className={`p-5 ${CARD}`}>
			<div className="flex items-start gap-3">
				<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-bold tabular-nums text-gray-500">
					{index + 1}
				</span>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<span
							className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${PRIORITY_STYLE[rec.priority]}`}
						>
							{PRIORITY_LABEL[rec.priority]}
						</span>
						<h3 className="text-sm font-semibold leading-snug text-gray-900">
							{rec.title}
						</h3>
					</div>
					{rec.rationale ? (
						<p className="mt-1.5 text-xs leading-relaxed text-gray-500">
							{rec.rationale}
						</p>
					) : null}
					{rec.action ? (
						<p className="mt-2.5 rounded-xl bg-stone-50 p-3 text-sm leading-relaxed text-gray-700">
							{rec.action}
						</p>
					) : null}
					{rec.kpi ? (
						<p className="mt-2 text-xs text-gray-400">
							<span className="font-medium text-gray-500">衡量：</span>
							{rec.kpi}
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
}

/* ─── v3 three-gate diagnostics ─────────────────────────────────────────── */

const RANK_LABEL: Record<number, string> = {
	1: "第1位",
	2: "第2位",
	3: "第3位",
	4: "第4位",
	5: "第5位及以后",
};

function ExecutiveSummary({ summary }: { summary: string }) {
	return (
		<section className="mt-8">
			<div className={`${CARD} border-l-4 border-l-stone-800 p-6`}>
				<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
					执行摘要
				</p>
				<p className="mt-2 text-sm leading-relaxed text-gray-700">{summary}</p>
			</div>
		</section>
	);
}

function RankDistributionChart({
	distribution,
}: {
	distribution: ReportRankBucket[];
}) {
	const data = distribution.map((d) => ({
		rank: d.rank,
		count: d.count,
		label: RANK_LABEL[d.rank] ?? `第${d.rank}位`,
	}));
	const max = axisMax(data.map((d) => d.count));

	return (
		<div className={`p-5 ${CARD}`}>
			<h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
				排名分布
			</h3>
			<p className="mt-1 text-xs text-gray-500">
				品牌在 AI 回答中被列出时，每次落在第几位
			</p>
			<div className="mt-3 h-[240px] w-full">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart
						data={data}
						margin={{ top: 16, right: 8, bottom: 24, left: 0 }}
					>
						<CartesianGrid
							strokeDasharray="3 3"
							vertical={false}
							opacity={0.35}
						/>
						<XAxis
							dataKey="label"
							interval={0}
							axisLine={false}
							tickLine={false}
							tick={{ fontSize: 11, fill: "#667085" }}
						/>
						<YAxis
							allowDecimals={false}
							domain={[0, max]}
							tick={{ fontSize: 11, fill: "#94a3b8" }}
							axisLine={false}
							tickLine={false}
							width={30}
						/>
						<Tooltip
							formatter={(value: number) => [`${value} 次`, "出现次数"]}
							cursor={{ fill: "rgba(15,23,42,0.04)" }}
							contentStyle={TOOLTIP_STYLE}
						/>
						<Bar
							dataKey="count"
							fill={BRAND_COLOR}
							radius={[5, 5, 0, 0]}
							maxBarSize={40}
							isAnimationActive={false}
						/>
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}

function QuestionBreakdown({
	breakdown,
}: { breakdown: ReportQuestionBreakdown[] }) {
	return (
		<div className={`p-5 ${CARD}`}>
			<h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
				问题措辞拆解
			</h3>
			<p className="mt-1 text-xs text-gray-500">不同问法下，品牌被提及的比例</p>
			<div className="mt-3 space-y-3">
				{breakdown.map((q) => (
					<div key={q.prompt}>
						<div className="flex items-center justify-between gap-3">
							<span className="min-w-0 flex-1 truncate text-sm text-gray-800">
								「{q.prompt}」
							</span>
							<span className="shrink-0 text-xs text-gray-500">
								{q.responseCount} 条
							</span>
							<span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900">
								{q.mentionRate}%
							</span>
						</div>
						<div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
							<div
								className="h-full rounded-full"
								style={{
									width: `${q.mentionRate}%`,
									backgroundColor: BRAND_COLOR,
								}}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

const SENTIMENT_BUCKET_LABEL: Record<string, { label: string; color: string }> =
	{
		"0-20": { label: "差评", color: BRAND_COLOR },
		"21-40": { label: "偏负面", color: "#F28E2B" },
		"41-59": { label: "中性", color: "#cbd5e1" },
		"60-80": { label: "正面", color: "#76B7B2" },
		"81-100": { label: "强正面", color: "#059669" },
	};

function SentimentDistributionChart({
	distribution,
}: {
	distribution: ReportSentimentBucket[];
}) {
	const data = distribution.map((d) => ({
		...d,
		color: SENTIMENT_BUCKET_LABEL[d.bucket]?.color ?? "#cbd5e1",
	}));
	const max = axisMax(data.map((d) => d.count));

	return (
		<div className={`p-5 ${CARD}`}>
			<h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
				口碑情感分布
			</h3>
			<p className="mt-1 text-xs text-gray-500">
				AI 回答对品牌的情感评分直方图（0–100）
			</p>
			<div className="mt-3 h-[240px] w-full">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart
						data={data}
						margin={{ top: 16, right: 8, bottom: 24, left: 0 }}
					>
						<CartesianGrid
							strokeDasharray="3 3"
							vertical={false}
							opacity={0.35}
						/>
						<XAxis
							dataKey="bucket"
							interval={0}
							axisLine={false}
							tickLine={false}
							tick={{ fontSize: 11, fill: "#667085" }}
						/>
						<YAxis
							allowDecimals={false}
							domain={[0, max]}
							tick={{ fontSize: 11, fill: "#94a3b8" }}
							axisLine={false}
							tickLine={false}
							width={30}
						/>
						<Tooltip
							formatter={(value: number) => [`${value} 条`, "回答数"]}
							cursor={{ fill: "rgba(15,23,42,0.04)" }}
							contentStyle={TOOLTIP_STYLE}
						/>
						<Bar
							dataKey="count"
							radius={[5, 5, 0, 0]}
							maxBarSize={40}
							isAnimationActive={false}
						>
							{data.map((d) => (
								<Cell key={d.bucket} fill={d.color} />
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>
			<div className="mt-2 flex flex-wrap gap-3 text-[11px] text-gray-500">
				{data.map((d) => (
					<span key={d.bucket} className="inline-flex items-center gap-1">
						<span
							className="h-2 w-2 rounded-sm"
							style={{ backgroundColor: d.color }}
						/>
						{SENTIMENT_BUCKET_LABEL[d.bucket]?.label ?? d.bucket}（{d.bucket}）
					</span>
				))}
			</div>
		</div>
	);
}

function PositiveThemes({ themes }: { themes: ReportThemeCount[] }) {
	const max = Math.max(...themes.map((t) => t.count), 1);
	return (
		<div className={`p-5 ${CARD}`}>
			<h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
				正面印象主题
			</h3>
			<p className="mt-1 text-xs text-gray-500">AI 反复提到的品牌正面标签</p>
			<div className="mt-3 space-y-2.5">
				{themes.map((t) => (
					<div key={t.theme} className="flex items-center gap-3">
						<span className="w-40 shrink-0 truncate text-sm text-gray-800">
							{t.theme}
						</span>
						<div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
							<div
								className="h-full rounded-full"
								style={{
									width: `${(t.count / max) * 100}%`,
									backgroundColor: REC_COLOR,
								}}
							/>
						</div>
						<span className="w-8 shrink-0 text-right text-xs tabular-nums text-gray-500">
							{t.count}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

function RiskCounts({ riskCounts }: { riskCounts: ReportRiskCounts }) {
	const items = [
		{ label: "严重", value: riskCounts.critical, color: "text-red-600" },
		{ label: "警告", value: riskCounts.warning, color: "text-amber-600" },
		{ label: "提示", value: riskCounts.info, color: "text-gray-500" },
	];
	return (
		<div className={`p-5 ${CARD}`}>
			<h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
				风险信号
			</h3>
			<p className="mt-1 text-xs text-gray-500">
				AI 回答中检测到的品牌风险条目
			</p>
			<div className="mt-3 grid grid-cols-3 gap-3">
				{items.map((it) => (
					<div
						key={it.label}
						className="rounded-xl border border-gray-200/70 bg-stone-50 p-3 text-center"
					>
						<p className={`text-2xl font-bold tabular-nums ${it.color}`}>
							{it.value}
						</p>
						<p className="mt-0.5 text-[11px] text-gray-500">{it.label}</p>
					</div>
				))}
			</div>
		</div>
	);
}

const QUOTE_STYLE: Record<ReportQuote["tone"], string> = {
	positive: "border-emerald-200 bg-emerald-50/50",
	negative: "border-red-200 bg-red-50/50",
	neutral: "border-gray-200 bg-stone-50",
};

function VerbatimQuotes({ quotes }: { quotes: ReportQuote[] }) {
	return (
		<div className={`p-5 ${CARD}`}>
			<h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
				AI 原话摘录
			</h3>
			<p className="mt-1 text-xs text-gray-500">各模型提到品牌时的代表性说法</p>
			<div className="mt-3 space-y-2">
				{quotes.map((q, index) => (
					<blockquote
						key={`${q.model}-${index}`}
						className={`rounded-xl border px-3 py-2 ${QUOTE_STYLE[q.tone]}`}
					>
						<p className="text-sm leading-relaxed text-gray-700">{q.text}</p>
						<cite className="mt-1 block text-[11px] not-italic text-gray-400">
							{q.model}
						</cite>
					</blockquote>
				))}
			</div>
		</div>
	);
}

function ContactInfo({
	contactInfo,
	totalResponses,
}: {
	contactInfo: ReportContactInfo;
	totalResponses: number;
}) {
	const missingRate =
		totalResponses > 0
			? Math.round((contactInfo.missingPhoneCount / totalResponses) * 100)
			: 0;
	return (
		<div className={`p-5 ${CARD}`}>
			<h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
				联系方式一致性
			</h3>
			<p className="mt-1 text-xs text-gray-500">
				AI 回答中给出的品牌电话是否一致
			</p>
			<div className="mt-3 grid grid-cols-2 gap-3">
				<div className="rounded-xl border border-gray-200/70 bg-stone-50 p-3 text-center">
					<p className="text-2xl font-bold tabular-nums text-gray-900">
						{contactInfo.phones.length}
					</p>
					<p className="mt-0.5 text-[11px] text-gray-500">不同电话版本</p>
				</div>
				<div className="rounded-xl border border-gray-200/70 bg-stone-50 p-3 text-center">
					<p className="text-2xl font-bold tabular-nums text-gray-900">
						{missingRate}%
					</p>
					<p className="mt-0.5 text-[11px] text-gray-500">回答未给电话</p>
				</div>
			</div>
			{contactInfo.phones.length > 0 ? (
				<div className="mt-3 flex flex-wrap gap-2">
					{contactInfo.phones.map((p) => (
						<span
							key={p.number}
							className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs tabular-nums text-gray-700"
						>
							{p.number} <span className="text-gray-400">×{p.count}</span>
						</span>
					))}
				</div>
			) : (
				<p className="mt-3 text-xs text-gray-400">所有回答都未给出电话。</p>
			)}
		</div>
	);
}

function SourceChannels({ channels }: { channels: ReportSourceChannel[] }) {
	const byModel = new Map<string, ReportSourceChannel[]>();
	for (const channel of channels) {
		const list = byModel.get(channel.model) ?? [];
		list.push(channel);
		byModel.set(channel.model, list);
	}
	return (
		<div className={`p-5 ${CARD}`}>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{[...byModel.entries()].map(([model, list]) => (
					<div key={model}>
						<p className="text-sm font-semibold text-gray-800">{model}</p>
						<ul className="mt-1.5 space-y-1">
							{list.map((channel) => (
								<li
									key={channel.domain}
									className="flex items-center justify-between gap-2 text-xs"
								>
									<span className="min-w-0 flex-1 truncate text-gray-600">
										{channel.domain}
									</span>
									<span className="shrink-0 tabular-nums text-gray-400">
										{channel.citationCount} 次
									</span>
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
		</div>
	);
}

export function ReportViewer({ data }: { data: ReportData }) {
	const {
		brand,
		mentionRates,
		gaps,
		generatedAt,
		totalResponses,
		brandPerception,
		sourcesIntelligence,
		perModelVisibility,
		recommendations,
		executiveSummary,
		rankDistribution,
		questionBreakdown,
		sentimentDistribution,
		positiveThemes,
		riskCounts,
		verbatimQuotes,
		contactInfo,
		sourceChannels,
	} = data;

	const brandRate = mentionRates.find((entry) => entry.isBrand)?.mentionRate;
	const brandRank = mentionRates.findIndex((entry) => entry.isBrand) + 1;

	return (
		<main className="min-h-screen bg-[#f7f6f4] text-gray-900">
			<div className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
				{/* Header */}
				<header className="overflow-hidden rounded-3xl border border-gray-200/70 bg-gradient-to-br from-white to-stone-50 p-6 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.25)] sm:p-8">
					<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
						AI 可见度报告 · GEO Report
					</p>
					<h1 className="mt-3 break-words text-3xl font-bold tracking-tight sm:text-4xl">
						{brand.name}
					</h1>
					{brand.domain ? (
						<p className="mt-1 break-all text-sm text-gray-500">
							{brand.domain}
						</p>
					) : null}

					<div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
						<StatPill label="分析回答数" value={`${totalResponses}`} />
						<StatPill
							label="您的提及率"
							value={brandRate === undefined ? "—" : `${brandRate}%`}
						/>
						<StatPill
							label="可见度排名"
							value={
								brandRank > 0 ? `#${brandRank} / ${mentionRates.length}` : "—"
							}
						/>
					</div>

					<p className="mt-5 text-xs text-gray-400">
						生成时间 {formatDate(generatedAt)}
					</p>
				</header>

				{executiveSummary ? (
					<ExecutiveSummary summary={executiveSummary} />
				) : null}

				<section className="mt-12">
					<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
						第一关
					</p>
					<h2 className="mt-1 text-xl font-bold tracking-tight">被提到</h2>
					<p className="mt-1 text-xs text-gray-500">
						用户泛泛问「{brand.name} 怎么样」时，品牌在 AI
						回答里出现的频率与位次
					</p>
				</section>

				<MentionChart
					mentionRates={mentionRates}
					totalResponses={totalResponses}
				/>

				{rankDistribution || questionBreakdown ? (
					<div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
						{rankDistribution ? (
							<RankDistributionChart distribution={rankDistribution} />
						) : null}
						{questionBreakdown && questionBreakdown.length > 0 ? (
							<QuestionBreakdown breakdown={questionBreakdown} />
						) : null}
					</div>
				) : null}

				{/* Gap analysis */}
				<section className="mt-10">
					<h2 className="text-lg font-bold tracking-tight">GEO 竞品对比</h2>
					<p className="mt-1 text-xs text-gray-500">
						与提及率最高的竞品「
						{gaps.find((g) => g.competitorName)?.competitorName || "—"}
						」在各关键维度上的对比
					</p>

					<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
						{gaps.map((gap) => (
							<GapCard key={gap.key} gap={gap} brandName={brand.name} />
						))}
					</div>
				</section>

				{/* Gate 2: trust */}
				{sentimentDistribution ||
				positiveThemes?.length ||
				riskCounts ||
				verbatimQuotes?.length ? (
					<section className="mt-12">
						<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
							第二关
						</p>
						<h2 className="mt-1 text-xl font-bold tracking-tight">被信任</h2>
						<p className="mt-1 text-xs text-gray-500">
							用户问「{brand.name} 靠谱吗」时，AI 是褒还是贬
						</p>

						<div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
							{sentimentDistribution ? (
								<SentimentDistributionChart
									distribution={sentimentDistribution}
								/>
							) : null}
							{positiveThemes && positiveThemes.length > 0 ? (
								<PositiveThemes themes={positiveThemes} />
							) : null}
						</div>

						{riskCounts || verbatimQuotes ? (
							<div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
								{riskCounts ? <RiskCounts riskCounts={riskCounts} /> : null}
								{verbatimQuotes && verbatimQuotes.length > 0 ? (
									<VerbatimQuotes quotes={verbatimQuotes} />
								) : null}
							</div>
						) : null}
					</section>
				) : null}

				{/* Gate 3: reach */}
				{contactInfo ? (
					<section className="mt-12">
						<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
							第三关
						</p>
						<h2 className="mt-1 text-xl font-bold tracking-tight">被联系到</h2>
						<p className="mt-1 text-xs text-gray-500">
							用户问联系方式时，AI 能否给出一致的电话
						</p>
						<div className="mt-4">
							<ContactInfo
								contactInfo={contactInfo}
								totalResponses={totalResponses}
							/>
						</div>
					</section>
				) : null}

				{/* Brand perception */}
				{brandPerception ? (
					<section className="mt-10">
						<h2 className="text-lg font-bold tracking-tight">AI 眼中的你</h2>
						<p className="mt-1 text-xs text-gray-500">
							AI 模型对「{brand.name}」的普遍认知
						</p>

						<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
							{brandPerception.bestKnownFor ? (
								<div className={`p-5 ${CARD}`}>
									<h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
										最以…著称
									</h3>
									<p className="mt-2 text-lg font-semibold text-gray-900">
										{brandPerception.bestKnownFor}
									</p>
								</div>
							) : null}

							{brandPerception.pricingPerception !== "not_mentioned" ? (
								<div className={`p-5 ${CARD}`}>
									<h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
										价格印象
									</h3>
									<p className="mt-2 text-lg font-semibold text-gray-900">
										{PRICING_LABEL[brandPerception.pricingPerception] ??
											brandPerception.pricingPerception}
									</p>
								</div>
							) : null}

							{brandPerception.coreClaims.length > 0 ? (
								<div className={`p-5 ${CARD}`}>
									<h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
										核心卖点
									</h3>
									<div className="mt-2 flex flex-wrap gap-2">
										{brandPerception.coreClaims.map((claim) => (
											<span
												key={claim}
												className="rounded-full border border-gray-200 bg-stone-50 px-3 py-1 text-xs text-gray-600"
											>
												{claim}
											</span>
										))}
									</div>
								</div>
							) : null}

							{brandPerception.differentiators.length > 0 ? (
								<div className={`p-5 ${CARD}`}>
									<h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
										差异化标签
									</h3>
									<div className="mt-2 flex flex-wrap gap-2">
										{brandPerception.differentiators.map((tag) => (
											<span
												key={tag}
												className="rounded-full border border-gray-200 bg-stone-50 px-3 py-1 text-xs text-gray-600"
											>
												{tag}
											</span>
										))}
									</div>
								</div>
							) : null}
						</div>
					</section>
				) : null}

				{sourcesIntelligence && sourcesIntelligence.length > 0 ? (
					<SourceSection sources={sourcesIntelligence} />
				) : null}

				{sourceChannels && sourceChannels.length > 0 ? (
					<section className="mt-10">
						<h2 className="text-lg font-bold tracking-tight">信源渠道</h2>
						<p className="mt-1 text-xs text-gray-500">
							每个模型引用最多的来源域名
						</p>
						<div className="mt-4">
							<SourceChannels channels={sourceChannels} />
						</div>
					</section>
				) : null}

				{perModelVisibility && perModelVisibility.length > 0 ? (
					<ModelSection entries={perModelVisibility} brandName={brand.name} />
				) : null}

				{/* Recommendations */}
				{recommendations && recommendations.length > 0 ? (
					<section className="mt-10">
						<h2 className="text-lg font-bold tracking-tight">行动建议</h2>
						<p className="mt-1 text-xs text-gray-500">
							按优先级排序的 GEO 优化动作
						</p>

						<div className="mt-4 space-y-3">
							{recommendations.map((rec, index) => (
								<RecommendationCard key={rec.title} rec={rec} index={index} />
							))}
						</div>
					</section>
				) : null}

				<footer className="mt-12 border-t border-gray-200 pt-5 text-center text-xs text-gray-400">
					本报告由 GEOK 自动生成 · 数据来源：AI 大模型回答分析
				</footer>
			</div>
		</main>
	);
}
