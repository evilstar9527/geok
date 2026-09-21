"use client";

import type { EChartsOption } from "echarts/types/dist/shared";
import { BarChart3, LineChart } from "lucide-react";
import { useMemo, useState } from "react";
import { ChartCard } from "./chart-card.js";
import {
	categoryAxis,
	colorForName,
	gridDefaults,
	legendDefaults,
	percentAxis,
	tooltipDefaults,
} from "./chart-theme.js";
import { EChart } from "./echart.js";

export interface TrendSeries {
	name: string;
	/** One value per category; `null` renders a gap rather than a zero. */
	values: (number | null)[];
}

interface TrendPanelProps {
	title: string;
	note?: string;
	categories: string[];
	series: TrendSeries[];
	height?: number;
	className?: string;
	/** Renders without the line/bar switch. */
	fixedType?: "line" | "bar";
	/** Overrides the per-series colour lookup, in series order. */
	colors?: string[];
	emptyText?: string;
}

/** Percentage trend over time, switchable between smoothed lines and bars. */
export function TrendPanel({
	title,
	note,
	categories,
	series,
	height = 250,
	className,
	fixedType,
	colors: colorOverride,
	emptyText = "暂无数据",
}: TrendPanelProps) {
	const [type, setType] = useState<"line" | "bar">(fixedType ?? "line");
	const active = fixedType ?? type;

	const option = useMemo<EChartsOption>(() => {
		const colors = series.map(
			(s, i) => colorOverride?.[i] ?? colorForName(s.name, i),
		);
		return {
			color: colors,
			tooltip: {
				...tooltipDefaults,
				valueFormatter: (value: unknown) =>
					typeof value === "number" ? `${value}%` : "-",
			},
			legend: { ...legendDefaults, data: series.map((s) => s.name) },
			grid: gridDefaults,
			xAxis: categoryAxis(categories),
			yAxis: percentAxis(),
			series: series.map((s, i) => ({
				name: s.name,
				type: active,
				data: s.values,
				...(active === "line"
					? {
							smooth: true,
							symbol: "circle",
							symbolSize: 5,
							lineStyle: { width: 2 },
							// Only the first series gets a fill, so stacked lines stay readable.
							areaStyle:
								i === 0
									? {
											color: {
												type: "linear" as const,
												x: 0,
												y: 0,
												x2: 0,
												y2: 1,
												colorStops: [
													{ offset: 0, color: `${colors[i]}26` },
													{ offset: 1, color: `${colors[i]}00` },
												],
											},
										}
									: undefined,
						}
					: { barMaxWidth: 14, itemStyle: { borderRadius: [2, 2, 0, 0] } }),
			})),
		};
	}, [categories, series, active, colorOverride]);

	const hasData = categories.length > 0 && series.length > 0;

	return (
		<ChartCard
			title={title}
			note={note}
			className={className}
			footerActions={
				fixedType ? undefined : (
					<div className="flex items-center overflow-hidden rounded-[6px] border border-[var(--geo-field-border)]">
						<button
							type="button"
							aria-label="折线图"
							aria-pressed={type === "line"}
							onClick={() => setType("line")}
							data-active={type === "line"}
							className="flex size-6 items-center justify-center text-neutral-400 transition-colors data-[active=true]:bg-[var(--geo-accent)] data-[active=true]:text-white"
						>
							<LineChart className="size-3.5" />
						</button>
						<button
							type="button"
							aria-label="柱状图"
							aria-pressed={type === "bar"}
							onClick={() => setType("bar")}
							data-active={type === "bar"}
							className="flex size-6 items-center justify-center border-[var(--geo-field-border)] border-l text-neutral-400 transition-colors data-[active=true]:bg-[var(--geo-accent)] data-[active=true]:text-white"
						>
							<BarChart3 className="size-3.5" />
						</button>
					</div>
				)
			}
		>
			{hasData ? (
				<EChart option={option} height={height} />
			) : (
				<div
					className="flex items-center justify-center text-[13px] text-[var(--geo-th-fg)]"
					style={{ height }}
				>
					{emptyText}
				</div>
			)}
		</ChartCard>
	);
}
