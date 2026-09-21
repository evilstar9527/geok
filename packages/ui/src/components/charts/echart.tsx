"use client";

import { cn } from "@oneglanse/utils";
import { BarChart, LineChart, TreemapChart } from "echarts/charts";
import {
	GridComponent,
	LegendComponent,
	TooltipComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption, EChartsType } from "echarts/types/dist/shared";
import { useEffect, useRef } from "react";

// Registered once per module: only the chart types the monitoring pages render.
echarts.use([
	LineChart,
	BarChart,
	TreemapChart,
	GridComponent,
	LegendComponent,
	TooltipComponent,
	CanvasRenderer,
]);

interface EChartProps {
	option: EChartsOption;
	/** Chart height in px. Width always follows the container. */
	height?: number;
	className?: string;
	onDataClick?: (params: { name: string; seriesName?: string }) => void;
}

/**
 * Minimal ECharts host: one instance per mount, resized with the container.
 *
 * `notMerge` is on for every update — panels swap whole series sets when the
 * filters change, and merging would leave the previous run's series behind.
 */
export function EChart({
	option,
	height = 260,
	className,
	onDataClick,
}: EChartProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<EChartsType | null>(null);
	const clickRef = useRef(onDataClick);
	clickRef.current = onDataClick;

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const chart = echarts.init(el, undefined, { renderer: "canvas" });
		chartRef.current = chart;
		chart.on("click", (params: unknown) => {
			const hit = params as { name?: string; seriesName?: string };
			clickRef.current?.({
				name: String(hit.name ?? ""),
				seriesName: hit.seriesName,
			});
		});
		const observer = new ResizeObserver(() => chart.resize());
		observer.observe(el);
		return () => {
			observer.disconnect();
			chart.dispose();
			chartRef.current = null;
		};
	}, []);

	useEffect(() => {
		chartRef.current?.setOption(option, { notMerge: true });
	}, [option]);

	return (
		<div
			ref={containerRef}
			className={cn("w-full", className)}
			style={{ height }}
		/>
	);
}
