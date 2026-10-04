"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import type { AnalysisRecord, Provider } from "@oneglanse/types";
import {
	NEGATIVE_COLOR,
	POSITIVE_COLOR,
	TreemapPanel,
	TrendPanel,
	WordCloud,
} from "@oneglanse/ui";
import {
	PROVIDER_DISPLAY,
	classifySourceMedia,
	getSourceMediaDefinition,
} from "@oneglanse/utils";
import { useMemo, useState } from "react";
import {
	buildBrandTrend,
	buildPlatformTrend,
	collectPositiveKeywords,
	summarizeBrands,
} from "../_utils/monitoring";
import styles from "./overview.module.css";

/** Brands drawn on the trend charts; more than this and the lines stop reading. */
const TREND_BRAND_LIMIT = 8;
/** Rows before the leaderboard collapses behind "view more". */
const LEADERBOARD_PREVIEW = 5;

interface MonitoringOverviewProps {
	records: AnalysisRecord[];
	brandName: string;
	/** Domain-level citation counts, already filtered to the active window. */
	sources: { domain: string; citationCount: number }[];
}

export function MonitoringOverview({
	records,
	brandName,
	sources,
}: MonitoringOverviewProps) {
	const { t, locale } = useLocale();
	const isZh = locale === "zh-CN";
	const [showAllBrands, setShowAllBrands] = useState(false);
	const [keywordTone, setKeywordTone] = useState<"positive" | "negative">(
		"positive",
	);

	const { total, brands } = useMemo(
		() => summarizeBrands(records, brandName),
		[records, brandName],
	);
	const self = brands.find((brand) => brand.isSelf) ?? null;
	// Equal mention rates share a competition rank.
	const rank =
		total > 0 && self && brands.some((brand) => brand.mentionRate > 0)
			? 1 +
				brands.filter((brand) => brand.mentionRate > self.mentionRate).length
			: null;
	const mentionSum = brands.reduce((sum, brand) => sum + brand.mentionRate, 0);
	const share =
		total > 0 && self && mentionSum > 0
			? (self.mentionRate / mentionSum) * 100
			: null;
	const leader = brands[0];
	const gap =
		total > 0 && self && leader && mentionSum > 0
			? leader.mentionRate - self.mentionRate
			: null;

	// The monitored brand leads: it holds series 0, which is what earns it the
	// brand green and the single area wash (see chart-theme.ts).
	const trendBrands = useMemo(() => {
		const names = brands
			.slice(0, TREND_BRAND_LIMIT)
			.map((b) => b.name)
			.filter((name) => name !== self?.name);
		return self ? [self.name, ...names] : names;
	}, [brands, self]);

	const mentionTrend = useMemo(
		() => buildBrandTrend(records, brandName, "mentionRate", trendBrands),
		[records, brandName, trendBrands],
	);
	const platformTrend = useMemo(() => {
		const trend = buildPlatformTrend(
			records,
			brandName,
			"mentionRate",
			brandName,
		);
		return {
			categories: trend.categories,
			series: trend.series.map((entry) => ({
				...entry,
				name:
					PROVIDER_DISPLAY[entry.name as Provider]?.displayName ?? entry.name,
			})),
		};
	}, [records, brandName]);
	const sentimentTrend = useMemo(() => {
		const positive = buildBrandTrend(records, brandName, "positiveRate", [
			brandName,
		]);
		const negative = buildBrandTrend(records, brandName, "negativeRate", [
			brandName,
		]);
		return {
			categories: positive.categories,
			series: [
				{
					name: t("Positive sentiment share"),
					values: positive.series[0]?.values ?? [],
				},
				{
					name: t("Negative sentiment share"),
					values: negative.series[0]?.values ?? [],
				},
			],
		};
	}, [records, brandName, t]);

	const positiveKeywords = useMemo(
		() => collectPositiveKeywords(records),
		[records],
	);

	const citations = useMemo(() => buildCitations(records), [records]);

	const treemapNodes = useMemo(() => {
		const totalCitations = sources.reduce((sum, s) => sum + s.citationCount, 0);
		if (totalCitations === 0) return [];
		return sources
			.slice()
			.sort((a, b) => b.citationCount - a.citationCount)
			.slice(0, 12)
			.map((source) => ({
				name: source.domain,
				value: (source.citationCount / totalCitations) * 100,
				category: getSourceMediaDefinition(classifySourceMedia(source.domain))
					.label,
			}));
	}, [sources]);

	const windowNote = isZh
		? `共 ${total} 条已分析回答`
		: `${total} analysed responses`;

	const tiles = [
		{
			label: t("Brand mention rate"),
			value: total > 0 ? self?.mentionRate : undefined,
			primary: true,
		},
		{
			label: t("First mention rate"),
			value: total > 0 ? self?.firstRate : undefined,
		},
		{
			label: t("Top3 mention rate"),
			value: total > 0 ? self?.top3Rate : undefined,
		},
		{
			label: t("Positive sentiment share"),
			value: total > 0 ? self?.positiveRate : undefined,
		},
		{
			label: t("Negative sentiment share"),
			value: total > 0 ? self?.negativeRate : undefined,
		},
	];

	const preview = brands.slice(0, LEADERBOARD_PREVIEW);
	// Keep the monitored brand visible even outside the top-five preview.
	const leaderboard = showAllBrands
		? brands
		: self && !preview.includes(self)
			? [...preview, self]
			: preview;

	return (
		<div className={styles.overview}>
			<section
				className={styles.competition}
				aria-label={isZh ? "品牌竞争位置" : "Competitive position"}
			>
				<div className={styles.competitionHeading}>
					<div>
						<h2>{isZh ? "品牌竞争位置" : "Your competitive position"}</h2>
						<p>
							{brandName} · {windowNote}
						</p>
					</div>
					<span className={styles.scope}>
						{isZh ? "按提及率排名" : "Ranked by mention rate"}
					</span>
				</div>
				<div className={styles.competitionStats}>
					<div className={styles.rankStat}>
						<span>{isZh ? "品牌排名" : "Brand rank"}</span>
						<strong>
							{rank === null ? "—" : `#${rank}`}
							<small>{rank === null ? "" : ` / ${brands.length}`}</small>
						</strong>
						<p>
							{rank !== null
								? isZh
									? "当前筛选范围内，提及率相同则并列"
									: "Within your filters; equal rates share a rank"
								: isZh
									? total > 0
										? "当前没有品牌提及"
										: "等待已分析回答"
									: total > 0
										? "No brand mentions in this range"
										: "Awaiting analysed responses"}
						</p>
					</div>
					<div className={styles.competitionStat}>
						<span>{isZh ? "品牌提及份额" : "Share of brand mentions"}</span>
						<strong>{share === null ? "—" : `${share.toFixed(1)}%`}</strong>
						<p>
							{isZh
								? "占当前品牌与竞品提及次数之和"
								: "Of mentions across your brand and competitors"}
						</p>
					</div>
					<div className={styles.competitionStat}>
						<span>{isZh ? "距领先品牌" : "Gap to the leader"}</span>
						<strong>
							{gap === null ? "—" : gap.toFixed(1)}
							{gap !== null && <small>{isZh ? " 个百分点" : " pp"}</small>}
						</strong>
						<p>
							{gap === null
								? isZh
									? total > 0
										? "当前没有品牌提及"
										: "等待已分析回答"
									: total > 0
										? "No brand mentions in this range"
										: "Awaiting analysed responses"
								: gap === 0
									? isZh
										? "当前提及率并列或独占第一"
										: "Leading or tied for the highest mention rate"
									: `${isZh ? "领先品牌：" : "Leader: "}${leader?.name}`}
						</p>
					</div>
				</div>
			</section>
			{/* 品牌排行榜 */}
			<section className="geo-card">
				<div className="geo-card-head">
					<span className="geo-card-title">{t("Brand leaderboard")}</span>
					{brands.length > LEADERBOARD_PREVIEW && (
						<button
							type="button"
							aria-expanded={showAllBrands}
							onClick={() => setShowAllBrands((prev) => !prev)}
							className="geo-btn-text text-[12px]"
						>
							{showAllBrands ? (isZh ? "收起" : "Show less") : t("View more")}
						</button>
					)}
				</div>
				<div className="overflow-x-auto pb-2">
					<table className="geo-table">
						<thead>
							<tr>
								<th className="text-left">{t("Brand")}</th>
								<th className="text-center">{t("Brand mention rate")}</th>
								<th className="text-center">{t("Top3 mention rate")}</th>
								<th className="text-center">{t("First mention rate")}</th>
							</tr>
						</thead>
						<tbody>
							{leaderboard.length === 0 ? (
								<tr>
									<td colSpan={4} className="py-6 text-center">
										{t("No data")}
									</td>
								</tr>
							) : (
								leaderboard.map((brand) => (
									<tr
										key={brand.name}
										data-self={brand.isSelf ? "true" : undefined}
									>
										<td className="text-left">
											<span className={styles.tableRank}>
												{total > 0 && mentionSum > 0
													? 1 +
														brands.filter(
															(entry) => entry.mentionRate > brand.mentionRate,
														).length
													: "—"}
											</span>
											{brand.name}
											{brand.isSelf && (
												<span className="geo-self-tag">
													{t("Current brand")}
												</span>
											)}
										</td>
										<td className="text-center tabular-nums">
											<div className={styles.rateCell}>
												<span>
													{total > 0 ? `${brand.mentionRate.toFixed(2)}%` : "—"}
												</span>
												<span className={styles.rateTrack} aria-hidden="true">
													<span style={{ width: `${brand.mentionRate}%` }} />
												</span>
											</div>
										</td>
										<td className="text-center tabular-nums">
											{total > 0 ? `${brand.top3Rate.toFixed(2)}%` : "—"}
										</td>
										<td className="text-center tabular-nums">
											{total > 0 ? `${brand.firstRate.toFixed(2)}%` : "—"}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</section>

			{/* 品牌指数总览 */}
			<section className="geo-card">
				<h2 className="geo-section-title">{t("Brand index overview")}</h2>
				<div className="geo-stat-grid">
					{tiles.map((tile) => (
						<div
							key={tile.label}
							className="geo-stat-tile"
							data-primary={tile.primary ? "true" : undefined}
						>
							<div className="geo-stat-label">{tile.label}</div>
							<div className="geo-stat-value">
								{tile.value === undefined ? "—" : `${tile.value.toFixed(2)}%`}
							</div>
						</div>
					))}
				</div>
			</section>

			<div className={styles.trends}>
				<TrendPanel
					title={t("Mention rate trend")}
					note={windowNote}
					categories={mentionTrend.categories}
					series={mentionTrend.series}
					selfName={brandName}
					emptyText={t("No data")}
					height={280}
				/>

				<TrendPanel
					title={t("Platform mention comparison")}
					note={windowNote}
					categories={platformTrend.categories}
					series={platformTrend.series}
					emptyText={t("No data")}
					height={280}
				/>
			</div>

			{/* 品牌情绪指数 */}
			<section className="geo-card">
				<h2 className="geo-section-title">{t("Brand sentiment index")}</h2>
				<div className="grid gap-3 px-4 pb-4 lg:grid-cols-[320px_1fr]">
					<div className="flex items-center justify-center gap-4 rounded-[6px] border border-[var(--geo-card-border)] bg-[var(--geo-th-bg)] px-4 py-5">
						<div className="text-center">
							<div className="text-[13px] text-[var(--geo-th-fg)]">
								{t("Positive sentiment share")}
							</div>
							<div className="mt-1.5 font-bold text-[24px] text-[var(--geo-accent-ink)]">
								{total > 0 && self ? `${self.positiveRate.toFixed(2)}%` : "—"}
							</div>
						</div>
						<span className="text-[12px] text-neutral-300">VS</span>
						<div className="text-center">
							<div className="text-[13px] text-[var(--geo-th-fg)]">
								{t("Negative sentiment share")}
							</div>
							{/* NEGATIVE_COLOR is tuned for a chart stroke on white; on the
							    dark panel it reads at ~1.4:1, so the figure takes a lighter
							    step of the same red. */}
							<div className="mt-1.5 font-bold text-[24px] text-[#a4161a] dark:text-[#e88b8b]">
								{total > 0 && self ? `${self.negativeRate.toFixed(2)}%` : "—"}
							</div>
						</div>
					</div>
					<TrendPanel
						title={t("Sentiment trend")}
						note={windowNote}
						categories={sentimentTrend.categories}
						series={sentimentTrend.series}
						colors={[POSITIVE_COLOR, NEGATIVE_COLOR]}
						emptyText={t("No data")}
						height={200}
					/>
				</div>
			</section>

			{/* 行业情绪词 */}
			<section className="geo-card">
				<h2 className="geo-section-title">{t("Industry sentiment terms")}</h2>
				<div className="flex justify-center pb-1">
					<div className="flex overflow-hidden rounded-[6px] border border-[var(--geo-field-border)]">
						{(["positive", "negative"] as const).map((tone) => (
							<button
								key={tone}
								type="button"
								onClick={() => setKeywordTone(tone)}
								aria-pressed={keywordTone === tone}
								data-active={keywordTone === tone}
								className="h-7 px-5 font-medium text-[12px] text-neutral-500 transition-colors hover:text-[var(--geo-accent-ink)] data-[active=true]:bg-[var(--geo-accent)] data-[active=true]:text-[var(--geo-on-accent)]"
							>
								{tone === "positive"
									? t("Positive keywords")
									: t("Negative keywords")}
							</button>
						))}
					</div>
				</div>
				<WordCloud
					items={keywordTone === "positive" ? positiveKeywords : []}
					height={280}
					emptyText={t("No keywords")}
				/>
			</section>

			{/* 信源分析 */}
			<section className="geo-card">
				<h2 className="geo-section-title">{t("Source analysis")}</h2>
				<div className="px-4 pb-2">
					<span className="geo-card-title">{t("Media distribution")}</span>
				</div>
				<div className="px-2 pb-3">
					<TreemapPanel nodes={treemapNodes} emptyText={t("No data")} />
				</div>
				<div className="px-4 pt-1 pb-2">
					<span className="geo-card-title">{t("Citation analysis")}</span>
				</div>
				<div className="overflow-x-auto pb-3">
					<table className="geo-table">
						<thead>
							<tr>
								<th className="text-left">{isZh ? "文章标题" : "Title"}</th>
								<th className="w-40 text-center">{isZh ? "来源" : "Source"}</th>
								<th className="w-32 text-center">
									{isZh ? "AI引用占比" : "Citation share"}
								</th>
							</tr>
						</thead>
						<tbody>
							{citations.length === 0 ? (
								<tr>
									<td colSpan={3} className="py-6 text-center">
										{t("No data")}
									</td>
								</tr>
							) : (
								citations.map((citation) => (
									<tr key={citation.key}>
										<td className="max-w-[560px]">
											{citation.url ? (
												<a
													href={citation.url}
													target="_blank"
													rel="noreferrer"
													className="line-clamp-2 hover:underline"
												>
													{citation.title}
												</a>
											) : (
												<span className="line-clamp-2">{citation.title}</span>
											)}
										</td>
										<td className="text-center text-[var(--geo-th-fg)]">
											{citation.domain}
										</td>
										<td className="text-center tabular-nums">
											{total > 0
												? `${((citation.count / total) * 100).toFixed(2)}%`
												: "—"}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	);
}

interface Citation {
	key: string;
	title: string;
	domain: string;
	url: string;
	count: number;
}

/** Rows before the citation table gets its own page — the top cited articles. */
const CITATION_LIMIT = 10;

/**
 * Cited articles ranked by how many analysed responses referenced them.
 * Keyed by URL so the same article cited by several platforms counts once per
 * response rather than once per platform.
 */
function buildCitations(records: AnalysisRecord[]): Citation[] {
	const byUrl = new Map<string, Citation>();
	for (const record of records) {
		const seen = new Set<string>();
		for (const source of record.sources ?? []) {
			const url = source.url?.trim();
			const key = url || source.title?.trim();
			if (!key || seen.has(key)) continue;
			seen.add(key);
			const existing = byUrl.get(key);
			if (existing) {
				existing.count++;
				continue;
			}
			byUrl.set(key, {
				key,
				title: source.title?.trim() || url || "—",
				domain: source.domain ?? hostOf(url),
				url: url ?? "",
				count: 1,
			});
		}
	}
	return [...byUrl.values()]
		.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
		.slice(0, CITATION_LIMIT);
}

function hostOf(url: string | undefined): string {
	if (!url) return "—";
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return "—";
	}
}
