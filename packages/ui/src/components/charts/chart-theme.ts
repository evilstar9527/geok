/**
 * Shared ECharts styling for the monitoring dashboard.
 *
 * Series colours are assigned by brand/platform name rather than by array index
 * so a brand keeps the same colour across every panel on a page, even when the
 * panels sort or filter their series differently.
 */

/**
 * Series palette for brand comparisons. Led by the brand accent so the first
 * series — usually the monitored brand — reads as "ours".
 */
export const BRAND_COLORS = [
	"#00618c",
	"#e8833a",
	"#3d9fc9",
	"#5b8c5a",
	"#c94f4f",
	"#7a6ba8",
	"#c98aa8",
	"#4a7a8c",
	"#a8894a",
	"#6b7d8c",
] as const;

/** Fixed colours for the AI platforms, so a platform reads the same everywhere. */
export const PLATFORM_COLORS: Record<string, string> = {
	doubao: "#e8833a",
	deepseek: "#00618c",
	yuanbao: "#3d9fc9",
	qianwen: "#7a6ba8",
	kimi: "#5b8c5a",
	wenxin: "#c98aa8",
	chatgpt: "#4a7a8c",
	perplexity: "#6b7d8c",
	gemini: "#c94f4f",
};

export const ACCENT = "#00618c";
export const POSITIVE_COLOR = "#00618c";
export const NEGATIVE_COLOR = "#c94f4f";

const AXIS_LABEL_COLOR = "#8b98a8";
const SPLIT_LINE_COLOR = "#eef1f5";

/** Stable colour for a named series: same name always gets the same colour. */
export function colorForName(name: string, index: number): string {
	const key = name.toLowerCase();
	for (const [platform, color] of Object.entries(PLATFORM_COLORS)) {
		if (key.includes(platform)) return color;
	}
	return BRAND_COLORS[index % BRAND_COLORS.length] as string;
}

export const percentFormatter = (value: number) => `${value}%`;

/** Category axis shared by every trend panel. */
export function categoryAxis(categories: string[]) {
	return {
		type: "category" as const,
		data: categories,
		boundaryGap: false,
		axisLine: { lineStyle: { color: "#dfe4ea" } },
		axisTick: { show: false },
		axisLabel: { color: AXIS_LABEL_COLOR, fontSize: 11 },
	};
}

/** Percentage value axis, dashed gridlines, 0-100 unless the data needs less. */
export function percentAxis(max: number | "dataMax" = 100) {
	return {
		type: "value" as const,
		max,
		axisLabel: { color: AXIS_LABEL_COLOR, fontSize: 11, formatter: "{value}%" },
		axisLine: { show: false },
		axisTick: { show: false },
		splitLine: {
			lineStyle: { color: SPLIT_LINE_COLOR, type: "dashed" as const },
		},
	};
}

export const tooltipDefaults = {
	trigger: "axis" as const,
	backgroundColor: "#ffffff",
	borderColor: "#dfe4ea",
	borderWidth: 1,
	padding: [8, 12] as [number, number],
	textStyle: { color: "#1f2937", fontSize: 12 },
	extraCssText:
		"box-shadow:0 8px 24px -12px rgba(15,23,42,0.25);border-radius:6px;",
};

/** Scrolling legend: matches the paged "1/2" legend the panels use. */
export const legendDefaults = {
	type: "scroll" as const,
	bottom: 0,
	itemWidth: 14,
	itemHeight: 8,
	itemGap: 14,
	textStyle: { color: "#475569", fontSize: 12 },
	pageIconSize: 10,
	pageIconColor: "#94a3b8",
	pageTextStyle: { color: "#94a3b8", fontSize: 11 },
};

export const gridDefaults = {
	top: 24,
	left: 8,
	right: 16,
	bottom: 36,
	containLabel: true,
};
