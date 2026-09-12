"use client";

import { TrendingUp } from "lucide-react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Card } from "../card.js";
import type { DashboardTrendPoint } from "./types.js";

// Matches the "your brand" series colour used by the report viewer.
const BRAND_COLOR = "#E15759";

const TOOLTIP_STYLE = {
	borderRadius: 12,
	border: "1px solid rgba(15,23,42,0.08)",
	boxShadow: "0 12px 32px -18px rgba(15,23,42,0.35)",
	fontSize: 12,
	padding: "6px 10px",
} as const;

/** `YYYY-MM-DD` → `MM-DD`; the year is redundant on a ≤30-day axis. */
function toAxisLabel(date: string): string {
	return date.slice(5);
}

export function TrendChart({
	data,
	locale = "en",
}: {
	data: DashboardTrendPoint[];
	locale?: "zh-CN" | "en";
}) {
	const isZh = locale === "zh-CN";

	const emptyState = (
		<Card className="flex min-h-[280px] min-w-0 flex-col p-5">
			<div className="min-w-0">
				<h1 className="mt-2 text-base font-semibold leading-none tracking-tight text-gray-900 sm:text-lg dark:text-gray-100">
					{isZh ? "GEO 总分趋势" : "GEO Score Trend"}
				</h1>
				<p className="mt-2 text-xs text-muted-foreground">
					{isZh
						? "GEO 总分随时间的变化。"
						: "How your GEO score changes over time."}
				</p>
			</div>
			<div className="flex flex-1 items-center justify-center">
				<div className="w-full max-w-md rounded-[var(--app-radius)] border border-gray-100/80 bg-white p-6 text-center shadow-[0_20px_60px_-32px_rgba(15,23,42,0.18)] dark:border-gray-800 dark:bg-neutral-950 dark:shadow-[0_20px_60px_-32px_rgba(0,0,0,0.55)]">
					<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--app-radius)] border border-gray-200/70 bg-stone-100 dark:border-gray-800 dark:bg-neutral-900">
						<TrendingUp className="h-5 w-5 text-muted-foreground" />
					</div>
					<h3 className="mt-4 text-[13px] font-semibold text-gray-900 sm:text-sm dark:text-gray-100">
						{isZh ? "暂无趋势数据" : "No trend data yet"}
					</h3>
					<p className="mt-2 text-xs leading-relaxed text-muted-foreground">
						{isZh
							? "运行并分析提示词后，这里会显示 GEO 总分随时间的变化。"
							: "Run and analyse prompts to see how your GEO score changes over time."}
					</p>
				</div>
			</div>
		</Card>
	);

	if (data.length === 0) return emptyState;

	return (
		<Card className="min-w-0 p-5">
			<div className="min-w-0">
				<h1 className="mt-2 text-base font-semibold leading-none tracking-tight text-gray-900 sm:text-lg dark:text-gray-100">
					{isZh ? "GEO 总分趋势" : "GEO Score Trend"}
				</h1>
				<p className="mt-2 text-xs text-muted-foreground">
					{isZh
						? "按天统计，取当天所有已分析回答的平均分。"
						: "Daily average across the answers analysed that day."}
				</p>
			</div>

			<div className="h-[280px] w-full">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart
						data={data}
						margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
					>
						<CartesianGrid
							strokeDasharray="3 3"
							vertical={false}
							opacity={0.25}
						/>
						<XAxis
							dataKey="date"
							tickFormatter={toAxisLabel}
							tick={{ fontSize: 11, fill: "#667085" }}
							axisLine={false}
							tickLine={false}
							minTickGap={24}
						/>
						<YAxis
							domain={[0, 100]}
							tick={{ fontSize: 11, fill: "#667085" }}
							axisLine={false}
							tickLine={false}
							width={32}
						/>
						<Tooltip
							contentStyle={TOOLTIP_STYLE}
							formatter={(value: number) => [
								`${value}/100`,
								isZh ? "GEO 总分" : "GEO Score",
							]}
						/>
						<Line
							type="monotone"
							dataKey="score"
							stroke={BRAND_COLOR}
							strokeWidth={2}
							dot={{ r: 3, fill: BRAND_COLOR, strokeWidth: 0 }}
							activeDot={{ r: 5 }}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</Card>
	);
}
