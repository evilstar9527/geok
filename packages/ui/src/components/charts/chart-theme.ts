/**
 * Shared ECharts styling for the monitoring dashboard.
 *
 * Series colours are assigned by brand/platform name rather than by array index
 * so a brand keeps the same colour across every panel on a page, even when the
 * panels sort or filter their series differently.
 *
 * Every order below is validated for separation (OKLab ΔE, CVD-simulated, on
 * the light chart surface #ffffff). The ORDERING is the safety mechanism, not
 * decoration — re-running the dataviz palette validator is part of changing it.
 */

/** The monitored brand's own series: the site's Tiffany green, deepened a step. */
export const SELF_COLOR = "#0f9e90";
/**
 * Its area wash. At 2.17:1 on white the homepage green is the faintest thing on
 * the chart as a stroke, but it is exactly right as a fill — which is how the
 * marketing site itself uses it.
 */
export const SELF_FILL = "#5fbfbb";

/**
 * Series palette for brand comparisons, drawn in index order — the monitored
 * brand is series 0 and takes SELF_COLOR, so slot 0 here faces it directly.
 * Worst adjacent pair: CVD ΔE 11.0, normal-vision 16.3 (targets 8 / 15).
 */
export const BRAND_COLORS = [
	"#4a3aa7",
	"#2a78d6",
	"#eda100",
	"#a4161a",
	"#a21caf",
	"#56b4e9",
	"#e87ba4",
	"#d55e00",
] as const;

/**
 * Fixed colours for the AI platforms, so a platform reads the same everywhere.
 *
 * Unlike the brand chart this one draws whichever platforms the data happens to
 * contain, so no single ordering describes it and the palette is chosen for its
 * worst pair instead: normal-vision ΔE 16.3 (the old set scored 4.2 — two greys
 * no reader could separate). Nine categorical series cannot clear the all-pairs
 * floor, so the legend and tooltip carry identity; colour is a hint, not proof.
 */
export const PLATFORM_COLORS: Record<string, string> = {
	chatgpt: "#2a78d6",
	deepseek: "#eda100",
	doubao: "#a4161a",
	gemini: "#a21caf",
	kimi: "#56b4e9",
	perplexity: "#e87ba4",
	qianwen: "#d55e00",
	wenxin: "#4a3aa7",
	yuanbao: "#d6336c",
};

export const ACCENT = SELF_COLOR;
export const POSITIVE_COLOR = SELF_COLOR;
export const NEGATIVE_COLOR = "#a4161a";

const AXIS_LABEL_COLOR = "#5b6268";
const SPLIT_LINE_COLOR = "#d8e3df";

/**
 * Stable colour for a named series: same name always gets the same colour.
 * Pass the monitored brand's name to give its series the brand green.
 */
export function colorForName(
	name: string,
	index: number,
	selfName?: string,
): string {
	const key = name.toLowerCase();
	if (selfName && key === selfName.toLowerCase()) return SELF_COLOR;
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
		axisLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
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
	borderColor: SPLIT_LINE_COLOR,
	borderWidth: 1,
	padding: [8, 12] as [number, number],
	textStyle: { color: "#242a2e", fontSize: 12 },
	extraCssText:
		"box-shadow:0 8px 24px -12px rgba(36,42,46,0.25);border-radius:10px;",
};

/** Scrolling legend: matches the paged "1/2" legend the panels use. */
export const legendDefaults = {
	type: "scroll" as const,
	bottom: 0,
	itemWidth: 14,
	itemHeight: 8,
	itemGap: 14,
	textStyle: { color: AXIS_LABEL_COLOR, fontSize: 12 },
	pageIconSize: 10,
	pageIconColor: "#8b98a8",
	pageTextStyle: { color: "#8b98a8", fontSize: 11 },
};

export const gridDefaults = {
	top: 24,
	left: 8,
	right: 16,
	bottom: 36,
	containLabel: true,
};
