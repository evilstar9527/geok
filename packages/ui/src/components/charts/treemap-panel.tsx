"use client";

import type { EChartsOption } from "echarts/types/dist/shared";
import { useMemo } from "react";
import { BRAND_COLORS, tooltipDefaults } from "./chart-theme.js";
import { EChart } from "./echart.js";

export interface TreemapNode {
	name: string;
	/** Share of citations, 0-100. */
	value: number;
	/** Secondary line inside the tile, e.g. the domain. */
	subtitle?: string;
	/** Third line inside the tile, e.g. the media category. */
	category?: string;
}

interface TreemapPanelProps {
	nodes: TreemapNode[];
	height?: number;
	emptyText?: string;
}

/** Citation share by source, sized by share and labelled in-tile. */
export function TreemapPanel({
	nodes,
	height = 340,
	emptyText = "暂无数据",
}: TreemapPanelProps) {
	const option = useMemo<EChartsOption>(() => {
		return {
			tooltip: {
				...tooltipDefaults,
				trigger: "item",
				formatter: (params: unknown) => {
					const hit = params as { name?: string; value?: number };
					const node = nodes.find((entry) => entry.name === hit.name);
					const lines = [`<strong>${hit.name ?? ""}</strong>`];
					if (node?.subtitle && node.subtitle !== hit.name)
						lines.push(node.subtitle);
					if (node?.category) lines.push(node.category);
					lines.push(`${(hit.value ?? 0).toFixed(1)}%`);
					return lines.join("<br/>");
				},
			},
			series: [
				{
					type: "treemap",
					roam: false,
					nodeClick: false,
					breadcrumb: { show: false },
					top: 4,
					left: 4,
					right: 4,
					bottom: 4,
					itemStyle: { borderWidth: 2, borderColor: "#ffffff", gapWidth: 2 },
					label: {
						show: true,
						position: "insideTopLeft",
						padding: 4,
						lineHeight: 16,
						overflow: "truncate",
						rich: {
							title: { fontSize: 13, fontWeight: "bold", color: "#ffffff" },
							sub: { fontSize: 11, color: "rgba(255,255,255,0.85)" },
							pct: { fontSize: 12, fontWeight: "bold", color: "#ffffff" },
						},
					},
					data: nodes.map((node, index) => ({
						name: node.name,
						value: node.value,
						subtitle: node.subtitle,
						category: node.category,
						itemStyle: {
							color: BRAND_COLORS[index % BRAND_COLORS.length] as string,
						},
						// Composed per item: ECharts does not pass custom data fields to a
						// series-level treemap label formatter.
						label: { formatter: tileLabel(node) },
					})),
				},
			],
		};
	}, [nodes]);

	if (nodes.length === 0) {
		return (
			<div
				className="flex items-center justify-center text-[13px] text-[var(--geo-th-fg)]"
				style={{ height }}
			>
				{emptyText}
			</div>
		);
	}
	return <EChart option={option} height={height} />;
}

/** Rich-text label for one tile: name, optional detail lines, then the share. */
function tileLabel(node: TreemapNode): string {
	const subtitle =
		node.subtitle && node.subtitle !== node.name ? node.subtitle : "";
	return [
		`{title|${node.name}}`,
		subtitle ? `{sub|${subtitle}}` : "",
		node.category ? `{sub|${node.category}}` : "",
		`{pct|${node.value.toFixed(1)}%}`,
	]
		.filter(Boolean)
		.join("\n");
}
