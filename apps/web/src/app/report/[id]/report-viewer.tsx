"use client";

import type { ReportData, ReportGap } from "@oneglanse/types";
import { AlertTriangle } from "lucide-react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

const BRAND_COLOR = "#E15759";
const COMPETITOR_COLOR = "#94a3b8";

function formatDate(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return date.toLocaleDateString("zh-CN", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

const GAP_LABEL: Record<ReportGap["key"], string> = {
	mention: "提及率",
	recommendation: "推荐率",
	rank: "平均排名",
	sentiment: "口碑得分",
	risk: "关键风险",
};

function formatValue(key: ReportGap["key"], value: number | null): string {
	if (value === null) return "—";
	if (key === "rank") return `#${value}`;
	if (key === "risk") return `${value} 个`;
	if (key === "sentiment") return `${value}`;
	return `${value}%`;
}

function gapHeadline(gap: ReportGap, brandName: string): string {
	switch (gap.key) {
		case "mention":
			if (gap.brandValue === 0) return `AI 模型几乎从未提及「${brandName}」`;
			if (gap.times !== null && gap.times > 1.05)
				return `竞品「${gap.competitorName}」的提及率是您的 ${gap.times} 倍`;
			return `「${brandName}」的提及率仍落后于竞品`;
		case "recommendation":
			if (gap.times !== null && gap.times > 1.05)
				return `竞品「${gap.competitorName}」被主动推荐的频率是您的 ${gap.times} 倍`;
			return `「${brandName}」被主动推荐的频率偏低`;
		case "rank":
			if (
				gap.brandValue !== null &&
				gap.competitorValue !== null &&
				gap.brandValue > gap.competitorValue
			)
				return `竞品「${gap.competitorName}」平均排第 ${gap.competitorValue}，您排第 ${gap.brandValue}`;
			return `「${brandName}」在回答中的排序落后于竞品`;
		case "sentiment":
			if (
				gap.brandValue !== null &&
				gap.competitorValue !== null &&
				gap.competitorValue > gap.brandValue
			)
				return `竞品「${gap.competitorName}」的口碑比您高 ${gap.competitorValue - gap.brandValue} 分`;
			return `「${brandName}」的口碑评价弱于竞品`;
		case "risk":
			if (gap.brandValue !== null && gap.brandValue > 0)
				return `检测到 ${gap.brandValue} 个关键风险信号`;
			return "暂无关键风险信号";
	}
}

function GapBar({
	brandValue,
	competitorValue,
}: {
	brandValue: number;
	competitorValue: number;
}) {
	const max = Math.max(brandValue, competitorValue, 1);
	const brandW = Math.max(2, (brandValue / max) * 100);
	const competitorW = Math.max(2, (competitorValue / max) * 100);

	return (
		<div className="mt-3 space-y-2">
			<div className="flex items-center gap-2">
				<span className="w-10 shrink-0 text-[11px] text-gray-500">竞品</span>
				<div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
					<div
						className="h-full rounded-full bg-gray-400"
						style={{ width: `${competitorW}%` }}
					/>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<span className="w-10 shrink-0 text-[11px] text-gray-500">您</span>
				<div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
					<div
						className="h-full rounded-full"
						style={{ width: `${brandW}%`, backgroundColor: BRAND_COLOR }}
					/>
				</div>
			</div>
		</div>
	);
}

function GapCard({
	gap,
	brandName,
}: {
	gap: ReportGap;
	brandName: string;
}) {
	const isRank = gap.key === "rank";
	const isRisk = gap.key === "risk";
	const comparable =
		!isRisk &&
		gap.brandValue !== null &&
		gap.competitorValue !== null &&
		!isRank;

	return (
		<div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.18)]">
			<div className="flex items-center gap-2">
				<AlertTriangle className="h-4 w-4 text-red-500" />
				<h3 className="text-sm font-semibold text-gray-900">
					{GAP_LABEL[gap.key]}
				</h3>
			</div>

			<p className="mt-2 text-base font-semibold leading-snug text-red-600">
				{gapHeadline(gap, brandName)}
			</p>

			{isRisk ? (
				<p className="mt-3 text-3xl font-bold tabular-nums text-red-600">
					{gap.brandValue ?? 0}
					<span className="ml-1 text-sm font-medium text-gray-500">
						个关键风险
					</span>
				</p>
			) : (
				<div className="mt-3 flex items-end gap-6">
					<div>
						<p className="text-[11px] text-gray-500">您（{brandName}）</p>
						<p className="text-2xl font-bold tabular-nums text-red-600">
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
				/>
			) : null}
		</div>
	);
}

export function ReportViewer({ data }: { data: ReportData }) {
	const { brand, mentionRates, gaps, generatedAt, totalResponses } = data;

	return (
		<main className="min-h-screen bg-[#f7f6f4] text-gray-900">
			<div className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
				{/* Header */}
				<header className="border-b border-gray-200 pb-6">
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
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
					<p className="mt-4 text-xs text-gray-400">
						生成时间 {formatDate(generatedAt)} · 基于 {totalResponses} 条 AI
						回答分析
					</p>
				</header>

				{/* Mention rate comparison */}
				<section className="mt-8">
					<h2 className="text-lg font-bold">AI 模型提及率对比</h2>
					<p className="mt-1 text-xs text-gray-500">
						在被分析的 {totalResponses} 条回答中，各品牌被提及的比例
					</p>

					<div className="mt-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.18)]">
						<div className="mb-3 flex items-center gap-4 text-[11px] text-gray-500">
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

						<div className="h-[280px] w-full sm:h-[320px]">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart
									data={mentionRates}
									layout="vertical"
									margin={{ top: 0, right: 44, bottom: 0, left: 8 }}
								>
									<CartesianGrid
										strokeDasharray="3 3"
										horizontal={false}
										opacity={0.25}
									/>
									<XAxis type="number" hide domain={[0, 100]} />
									<YAxis
										type="category"
										dataKey="name"
										width={120}
										tick={{ fontSize: 12, fill: "#667085" }}
										axisLine={false}
										tickLine={false}
									/>
									<Tooltip
										formatter={(value: number) => `${value}%`}
										cursor={{ fill: "rgba(0,0,0,0.04)" }}
									/>
									<Bar
										dataKey="mentionRate"
										radius={[0, 6, 6, 0]}
										barSize={20}
										label={{
											position: "right",
											fill: "#334155",
											fontSize: 12,
											formatter: (value: number) => `${value}%`,
										}}
									>
										{mentionRates.map((entry) => (
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

				{/* Gap analysis */}
				<section className="mt-8">
					<h2 className="text-lg font-bold">GEO 差距分析</h2>
					<p className="mt-1 text-xs text-gray-500">
						与领先竞品相比，您的品牌在这些关键维度上的差距
					</p>

					<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
						{gaps.map((gap) => (
							<GapCard key={gap.key} gap={gap} brandName={brand.name} />
						))}
					</div>
				</section>

				<footer className="mt-12 border-t border-gray-200 pt-5 text-center text-xs text-gray-400">
					本报告由 GEOK 自动生成 · 数据来源：AI 大模型回答分析
				</footer>
			</div>
		</main>
	);
}
