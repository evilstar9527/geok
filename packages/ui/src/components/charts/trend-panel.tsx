"use client";

import type { EChartsOption } from "echarts/types/dist/shared";
import { BarChart3, LineChart } from "lucide-react";
import { useMemo, useState } from "react";
import { ChartCard } from "./chart-card.js";
import {
	SELF_FILL,
	categoryAxis,
	colorForName,
	gridDefaults,
	legendDefaults,
	percentAxis,
	tooltipDefaults,
} from "./chart-theme.js";
import { EChart } from "./echart.js";

/** Hex alpha for the one filled series' area wash — 14% of SELF_FILL. */
const AREA_WASH_ALPHA = "24";

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
	/** The monitored brand, drawn in the brand green with a Tiffany-green wash. */
	selfName?: string;
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
	selfName,
	emptyText = "暂无数据",
}: TrendPanelProps) {
	const [type, setType] = useState<"line" | "bar">(fixedType ?? "line");
	const active = fixedType ?? type;

	const option = useMemo<EChartsOption>(() => {
		const colors = series.map(
			(s, i) => colorOverride?.[i] ?? colorForName(s.name, i, selfName),
		);
		// Only one series gets a fill, so stacked lines stay readable: the
		// monitored brand when we know it, otherwise whatever draws first.
		// The brand's wash is the homepage green even though its stroke had to
		// be a step darker — see SELF_FILL in chart-theme.
		const fillIndex = selfName
			? Math.max(
					0,
					series.findIndex((s) => s.name === selfName),
				)
			: 0;
		const fillColor = selfName ? SELF_FILL : colors[fillIndex];
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
							lineStyle: { width: i === fillIndex ? 2.5 : 2 },
							// Flat, not a gradient: ECharts normalises gradient stops to
							// the whole 0-100% grid box, which leaves the wash at ~5%
							// alpha by the time it reaches the line. See AREA_WASH_ALPHA.
							areaStyle:
								i === fillIndex
									? { color: `${fillColor}${AREA_WASH_ALPHA}` }
									: undefined,
						}
					: { barMaxWidth: 14, itemStyle: { borderRadius: [2, 2, 0, 0] } }),
			})),
		};
	}, [categories, series, active, colorOverride, selfName]);

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
							className="flex size-6 items-center justify-center text-neutral-400 transition-colors data-[active=true]:bg-[var(--geo-accent)] data-[active=true]:text-[var(--geo-on-accent)]"
						>
							<LineChart className="size-3.5" />
						</button>
						<button
							type="button"
							aria-label="柱状图"
							aria-pressed={type === "bar"}
							onClick={() => setType("bar")}
							data-active={type === "bar"}
							className="flex size-6 items-center justify-center border-[var(--geo-field-border)] border-l text-neutral-400 transition-colors data-[active=true]:bg-[var(--geo-accent)] data-[active=true]:text-[var(--geo-on-accent)]"
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
