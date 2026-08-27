"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip,
	Treemap,
	XAxis,
	YAxis,
} from "recharts";
import { Card } from "../card.js";

export type SourceDistributionChartItem = {
	name: string;
	domain: string;
	value: number;
	share: number;
	mediaType: string;
	color: string;
	providers: string[];
	urls: Array<{ title: string; url: string; citations: number }>;
};

export type MediaTypeChartItem = {
	key: string;
	name: string;
	value: number;
	share: number;
	color: string;
};

export type ProviderMediaChartItem = {
	provider: string;
	[key: string]: string | number;
};

export type MediaTypeLegendItem = {
	key: string;
	label: string;
	color: string;
};

type TreemapNodeProps = Partial<SourceDistributionChartItem> & {
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	depth?: number;
	locale?: "zh-CN" | "en";
};

function TreemapNode({
	x = 0,
	y = 0,
	width = 0,
	height = 0,
	depth = 0,
	name = "",
	domain = "",
	share = 0,
	value = 0,
	mediaType = "",
	color = "#8d98a8",
	providers = [],
	urls = [],
	locale = "en",
}: TreemapNodeProps): React.JSX.Element | null {
	if (depth !== 1 || width < 2 || height < 2) return null;
	const showDetails = width > 120 && height > 82;
	const showDomain = width > 150 && height > 112;

	const isZh = locale === "zh-CN";
	const tooltipLines = [
		name,
		domain,
		isZh
			? `${mediaType} · ${share.toFixed(1)}% · ${value} 次引用`
			: `${mediaType} · ${share.toFixed(1)}% · ${value} citations`,
		providers.length > 0
			? `${isZh ? "AI 平台" : "Providers"}: ${providers.join(", ")}`
			: "",
		...urls
			.slice(0, 3)
			.map((item) => `${item.title || item.url} (${item.citations})`),
	].filter(Boolean);

	return (
		<g>
			<title>{tooltipLines.join("\n")}</title>
			<rect
				x={x}
				y={y}
				width={Math.max(0, width - 2)}
				height={Math.max(0, height - 2)}
				fill={color}
				rx={3}
				stroke="rgba(255,255,255,.9)"
				strokeWidth={2}
			/>
			{width > 70 && height > 42 ? (
				<foreignObject
					x={x + 12}
					y={y + 10}
					width={Math.max(0, width - 26)}
					height={Math.max(0, height - 20)}
					pointerEvents="none"
				>
					<div className="overflow-hidden text-white">
						<p className="truncate text-sm font-semibold drop-shadow-sm">
							{name}
						</p>
						{showDomain ? (
							<p className="mt-1 truncate text-[11px] text-white/75">
								{domain}
							</p>
						) : null}
						{showDetails ? (
							<>
								<p className="mt-1 truncate text-[11px] text-white/80">
									{mediaType}
								</p>
								<p className="mt-1 text-sm font-semibold">
									{share.toFixed(1)}%
								</p>
							</>
						) : null}
					</div>
				</foreignObject>
			) : null}
		</g>
	);
}

function ChartTitle({ title, subtitle }: { title: string; subtitle?: string }) {
	return (
		<div className="mb-5">
			<h3 className="border-l-[3px] border-teal-500 pl-3 text-base font-semibold text-gray-900 dark:text-gray-100">
				{title}
			</h3>
			{subtitle ? (
				<p className="mt-1 pl-[15px] text-xs text-muted-foreground">
					{subtitle}
				</p>
			) : null}
		</div>
	);
}

export function SourceAnalysisCharts({
	sources,
	mediaTypes,
	providers,
	legend,
	locale = "en",
	scopeLabel,
}: {
	sources: SourceDistributionChartItem[];
	mediaTypes: MediaTypeChartItem[];
	providers: ProviderMediaChartItem[];
	legend: MediaTypeLegendItem[];
	locale?: "zh-CN" | "en";
	scopeLabel?: string;
}): React.JSX.Element {
	const isZh = locale === "zh-CN";
	const activeLegend = legend.filter((item) =>
		mediaTypes.some((mediaType) => mediaType.key === item.key),
	);

	return (
		<div className="space-y-5">
			<Card className="rounded-xl border-gray-200/80 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-neutral-950">
				<ChartTitle
					title={isZh ? "媒体分布分析" : "Source Distribution"}
					subtitle={
						scopeLabel
							? isZh
								? `当前范围：${scopeLabel}；悬停查看引用详情`
								: `Scope: ${scopeLabel}; hover for citation details`
							: isZh
								? "矩形面积代表当前筛选范围内的引用占比"
								: "Rectangle area represents citation share within the current filters"
					}
				/>
				<div className="h-[390px] w-full sm:h-[470px]">
					<ResponsiveContainer width="100%" height="100%">
						<Treemap
							data={sources}
							dataKey="value"
							nameKey="name"
							stroke="#fff"
							content={<TreemapNode locale={locale} />}
						/>
					</ResponsiveContainer>
				</div>
			</Card>

			<div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
				<Card className="rounded-xl border-gray-200/80 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-neutral-950">
					<ChartTitle
						title={isZh ? "媒体类型分布" : "Media Type Distribution"}
					/>
					<div className="h-[330px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={mediaTypes}
								layout="vertical"
								margin={{ top: 0, right: 38, bottom: 0, left: 16 }}
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
									width={94}
									tick={{ fontSize: 12, fill: "#667085" }}
									axisLine={false}
									tickLine={false}
								/>
								<Tooltip
									formatter={(value: number) => `${value.toFixed(1)}%`}
								/>
								<Bar dataKey="share" radius={[0, 6, 6, 0]} barSize={16}>
									{mediaTypes.map((entry) => (
										<Cell key={entry.key} fill={entry.color} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</Card>

				<Card className="rounded-xl border-gray-200/80 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-neutral-950">
					<ChartTitle
						title={
							isZh ? "媒体类型分布 AI 平台对比" : "Media Types by AI Platform"
						}
					/>
					<div className="mb-3 flex flex-wrap gap-x-3 gap-y-2">
						{activeLegend.map((item) => (
							<span
								key={item.key}
								className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
							>
								<span
									className="h-2.5 w-2.5 rounded-sm"
									style={{ backgroundColor: item.color }}
								/>
								{item.label}
							</span>
						))}
					</div>
					<div className="h-[300px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={providers}
								margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									vertical={false}
									opacity={0.25}
								/>
								<XAxis
									dataKey="provider"
									tick={{ fontSize: 11, fill: "#667085" }}
									axisLine={false}
									tickLine={false}
								/>
								<YAxis
									tickFormatter={(value) => `${value}%`}
									domain={[0, 100]}
									tick={{ fontSize: 11, fill: "#667085" }}
									axisLine={false}
									tickLine={false}
								/>
								<Tooltip
									formatter={(value: number) => `${value.toFixed(1)}%`}
								/>
								{activeLegend.map((item) => (
									<Bar
										key={item.key}
										dataKey={item.key}
										stackId="media"
										fill={item.color}
									/>
								))}
							</BarChart>
						</ResponsiveContainer>
					</div>
				</Card>
			</div>
		</div>
	);
}
