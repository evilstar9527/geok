"use client";

import { cn, getFaviconUrls } from "@oneglanse/utils";
import { Globe, Link2, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function StatCard({
	label,
	value,
	subtitle,
	icon: Icon,
	valueClassName = "text-gray-900 dark:text-gray-100",
	domain,
	showFavicon = false,
}: {
	label: string;
	value: string | number;
	subtitle?: string;
	icon: LucideIcon;
	valueClassName?: string;
	domain?: string;
	showFavicon?: boolean;
}) {
	const faviconUrls = showFavicon
		? getFaviconUrls(domain || String(value), String(value))
		: [];

	return (
		<div className="ui-list-item group flex min-h-[120px] min-w-0 flex-col justify-between rounded-[var(--app-radius)] border border-gray-100/80 bg-white p-4 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.18)] transition hover:border-gray-200 hover:bg-stone-50 dark:border-gray-800 dark:bg-neutral-950 dark:shadow-[0_20px_60px_-32px_rgba(0,0,0,0.55)] dark:hover:bg-neutral-900">
			<div className="flex items-center gap-2">
				<Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:scale-110" />
				<span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
					{label}
				</span>
			</div>

			<div className="mt-3 flex min-h-[40px] min-w-0 items-center gap-2 py-0.5">
				{showFavicon && faviconUrls[0] && (
					<img
						src={faviconUrls[0]}
						alt=""
						className="h-5 w-5 shrink-0 rounded-[var(--app-radius)]"
						onError={(e) => {
							(e.target as HTMLImageElement).style.display = "none";
						}}
					/>
				)}
				<span
					className={`min-w-0 break-words [overflow-wrap:anywhere] text-base font-semibold leading-tight tracking-tight sm:text-lg lg:text-xl xl:text-2xl ${valueClassName}`}
				>
					{value}
				</span>
			</div>

			{subtitle && (
				<span className="mt-1 break-words text-xs text-muted-foreground">
					{subtitle}
				</span>
			)}
		</div>
	);
}

export function AggregateStatsRow({
	presenceRate,
	rank,
	topSource,
	topCompetitor,
	topCompetitorDomain,
	className,
	locale = "en",
}: {
	presenceRate: number;
	rank: number | null;
	topSource: string;
	topCompetitor: string;
	topCompetitorDomain?: string;
	className?: string;
	locale?: "zh-CN" | "en";
}) {
	const isZh = locale === "zh-CN";
	return (
		<div
			className={cn(
				"grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4",
				className,
			)}
		>
			<StatCard
				icon={Globe}
				label={isZh ? "品牌提及率" : "Presence Rate"}
				value={`${presenceRate}%`}
				subtitle={
					isZh ? "提及品牌的提示词占比" : "Prompts mentioning your brand"
				}
			/>
			<StatCard
				icon={Trophy}
				label={isZh ? "平均排名" : "Rank"}
				value={rank === null ? "--" : `#${rank}`}
				subtitle={isZh ? "所有提示词中的平均位置" : "Avg rank across prompts"}
			/>
			<StatCard
				icon={Link2}
				label={isZh ? "核心信源" : "Top Source"}
				value={topSource}
				subtitle={
					isZh ? "被引用最多的信息来源" : "Most cited information source"
				}
				showFavicon
			/>
			<StatCard
				icon={Users}
				label={isZh ? "主要竞品" : "Top Competitor"}
				value={topCompetitor}
				subtitle={
					isZh
						? "回答中可见度最高的竞品"
						: "Highest visibility competitor in answers"
				}
				domain={topCompetitorDomain}
				showFavicon
			/>
		</div>
	);
}
