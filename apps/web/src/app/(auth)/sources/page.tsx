"use client";

import { ExportMenu } from "@/components/export-menu";
import { downloadCsv, downloadJson } from "@/lib/export/download";
import { useSafeSearchParams } from "@/lib/navigation/use-safe-search-params";
import type {
	GroupedSource,
	Provider,
	SourceGroupResult,
} from "@oneglanse/types";
import {
	Button,
	EmptyStatePanel,
	type MediaTypeChartItem,
	type ProviderMediaChartItem,
	SectionHeading,
	Skeleton,
	SourceAnalysisCharts,
	type SourceDistributionChartItem,
	type SourcePanelCitationDomain,
	type SourcePanelDomainRow,
	type SourcePanelMetrics,
	SourcesIntelligencePanel,
	TemporaryIssueState,
	WorkspaceRequiredState,
} from "@oneglanse/ui";
import {
	SOURCE_MEDIA_DEFINITIONS,
	classifySourceMedia,
	cleanCitedText,
	getDomain,
	getModelFavicon,
	getSourceMediaDefinition,
	getUniqueModelProviders,
	getUrlPath,
	joinCitedTexts,
	modelSelectors,
} from "@oneglanse/utils";
import {
	AlertTriangle,
	CalendarDays,
	FileText,
	Globe2,
	Link2,
	RotateCcw,
	SearchX,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePromptSources } from "../prompts/_lib/queries/prompt.queries";
import { useLayoutWorkspace } from "../workspace-context";

type DomainGroup = {
	domain: string;
	totalCitations: number;
	urlCount: number;
	providers: Set<string>;
	urls: GroupedSource[];
};

type DatePreset = "all" | "yesterday" | "7d" | "30d" | "custom";

const DATE_PRESETS: Array<{ value: DatePreset; label: string }> = [
	{ value: "yesterday", label: "昨天" },
	{ value: "7d", label: "最近一周" },
	{ value: "30d", label: "最近一月" },
	{ value: "all", label: "全部时间" },
];

function getDateRange(
	preset: DatePreset,
	customStart: string,
	customEnd: string,
): { startAt?: string; endAt?: string } {
	const now = new Date();
	if (preset === "all") return {};
	if (preset === "custom") {
		const start = customStart ? new Date(`${customStart}T00:00:00`) : null;
		const end = customEnd ? new Date(`${customEnd}T00:00:00`) : null;
		if (end) end.setDate(end.getDate() + 1);
		return {
			startAt: start?.toISOString(),
			endAt: end?.toISOString(),
		};
	}
	if (preset === "yesterday") {
		const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const start = new Date(end);
		start.setDate(start.getDate() - 1);
		return { startAt: start.toISOString(), endAt: end.toISOString() };
	}
	const start = new Date(now);
	start.setDate(start.getDate() - (preset === "7d" ? 7 : 30));
	return { startAt: start.toISOString(), endAt: now.toISOString() };
}

const SOURCES_METRIC_SKELETON_KEYS = [
	"sources-metric-a",
	"sources-metric-b",
	"sources-metric-c",
	"sources-metric-d",
] as const;

function getSourceConcentrationRisk(topDomainShare: number): string {
	if (topDomainShare >= 45) return "high";
	if (topDomainShare >= 30) return "moderate";
	return "healthy";
}

export default function SourcesPage(): React.JSX.Element {
	const [selectedProvider, setSelectedProvider] = useState<
		Provider | "All Models"
	>("All Models");
	const [datePreset, setDatePreset] = useState<DatePreset>("7d");
	const [customStart, setCustomStart] = useState("");
	const [customEnd, setCustomEnd] = useState("");

	const searchParams = useSafeSearchParams();
	const workspaceId = searchParams.get("workspace") ?? "";
	const activeWorkspace = useLayoutWorkspace();
	const brandDomain =
		activeWorkspace?.id === workspaceId ? activeWorkspace.domain : undefined;
	const dateRange = useMemo(
		() => getDateRange(datePreset, customStart, customEnd),
		[datePreset, customStart, customEnd],
	);
	const {
		data: promptSources,
		isLoading,
		error,
	} = usePromptSources(workspaceId, {
		...dateRange,
		modelProvider:
			selectedProvider === "All Models" ? undefined : selectedProvider,
	});

	const sourceStats = useMemo<SourceGroupResult | null>(() => {
		const data = promptSources;
		if (
			!data ||
			!data.sourceStats ||
			!Array.isArray(data.sourceStats.combined)
		) {
			return null;
		}
		return data.sourceStats as SourceGroupResult;
	}, [promptSources]);

	const displayedSources = useMemo<GroupedSource[]>(() => {
		if (!sourceStats) return [];
		return [...sourceStats.combined].sort(
			(a, b) => (b.totalSources ?? 0) - (a.totalSources ?? 0),
		);
	}, [sourceStats]);

	const domainGroups = useMemo<DomainGroup[]>(() => {
		const map = new Map<string, DomainGroup>();

		for (const source of displayedSources) {
			const domain = getDomain(source.url) || "unknown";
			const existing = map.get(domain) ?? {
				domain,
				totalCitations: 0,
				urlCount: 0,
				providers: new Set<string>(),
				urls: [],
			};

			existing.totalCitations += source.totalSources ?? 0;
			existing.urlCount += 1;
			for (const excerpt of source.excerpts) {
				if (excerpt.model_provider) {
					existing.providers.add(excerpt.model_provider);
				}
			}
			existing.urls.push(source);

			map.set(domain, existing);
		}

		return [...map.values()].sort(
			(a, b) => b.totalCitations - a.totalCitations,
		);
	}, [displayedSources]);

	const metrics = useMemo<SourcePanelMetrics>(() => {
		const totalUrls = displayedSources.length;
		const totalDomains = domainGroups.length;
		const totalCitations = displayedSources.reduce(
			(sum, s) => sum + (s.totalSources ?? 0),
			0,
		);
		const avgCitationsPerUrl = totalUrls
			? (totalCitations / totalUrls).toFixed(1)
			: "0.0";
		const topDomainCitations = domainGroups[0]?.totalCitations ?? 0;
		const topDomainShare = totalCitations
			? Math.round((topDomainCitations / totalCitations) * 100)
			: 0;

		return {
			totalDomains,
			totalUrls,
			totalCitations,
			avgCitationsPerUrl,
			topDomain: domainGroups[0]?.domain ?? "N/A",
			topDomainShare,
		};
	}, [displayedSources, domainGroups]);

	const domainRows = useMemo<SourcePanelDomainRow[]>(
		() =>
			domainGroups.map((group) => ({
				domain: group.domain,
				share:
					metrics.totalCitations > 0
						? (group.totalCitations / metrics.totalCitations) * 100
						: 0,
				totalCitations: group.totalCitations,
				urlCount: group.urlCount,
				providers: [...group.providers],
			})),
		[domainGroups, metrics.totalCitations],
	);

	const citationDomains = useMemo<SourcePanelCitationDomain[]>(
		() =>
			domainGroups.map((group) => ({
				domain: group.domain,
				totalCitations: group.totalCitations,
				urlCount: group.urlCount,
				providers: [...group.providers],
				urls: group.urls.map((source) => ({
					url: source.url,
					title: source.title,
					totalCitations: source.totalSources ?? 0,
					providers: [...getUniqueModelProviders(source.excerpts)],
					excerpts: source.excerpts.map((excerpt) => ({
						modelProvider: excerpt.model_provider ?? undefined,
						citedText: excerpt.cited_text
							? cleanCitedText(excerpt.cited_text)
							: undefined,
					})),
				})),
			})),
		[domainGroups],
	);

	const sourceChartData = useMemo<SourceDistributionChartItem[]>(() => {
		const visibleGroups = domainGroups.slice(0, 17);
		const rows = visibleGroups.map((group) => {
			const media = getSourceMediaDefinition(
				classifySourceMedia(group.domain, brandDomain),
			);
			return {
				name: group.urls[0]?.title || group.domain,
				domain: group.domain,
				value: group.totalCitations,
				share:
					metrics.totalCitations > 0
						? (group.totalCitations / metrics.totalCitations) * 100
						: 0,
				mediaType: media.label,
				color: media.color,
			};
		});
		const remaining = domainGroups
			.slice(17)
			.reduce((sum, group) => sum + group.totalCitations, 0);
		if (remaining > 0) {
			const media = getSourceMediaDefinition("other");
			rows.push({
				name: "其他来源",
				domain: `${domainGroups.length - 17} 个媒体`,
				value: remaining,
				share: (remaining / metrics.totalCitations) * 100,
				mediaType: media.label,
				color: media.color,
			});
		}
		return rows;
	}, [brandDomain, domainGroups, metrics.totalCitations]);

	const mediaTypeData = useMemo<MediaTypeChartItem[]>(() => {
		const counts = new Map<string, number>();
		for (const group of domainGroups) {
			const type = classifySourceMedia(group.domain, brandDomain);
			counts.set(type, (counts.get(type) ?? 0) + group.totalCitations);
		}
		return SOURCE_MEDIA_DEFINITIONS.flatMap((definition) => {
			const value = counts.get(definition.key) ?? 0;
			return value > 0
				? [
						{
							key: definition.key,
							name: definition.label,
							value,
							share:
								metrics.totalCitations > 0
									? (value / metrics.totalCitations) * 100
									: 0,
							color: definition.color,
						},
					]
				: [];
		}).sort((a, b) => b.value - a.value);
	}, [brandDomain, domainGroups, metrics.totalCitations]);

	const providerMediaData = useMemo<ProviderMediaChartItem[]>(() => {
		const counts = new Map<string, Map<string, number>>();
		for (const source of displayedSources) {
			const type = classifySourceMedia(source.url, brandDomain);
			for (const excerpt of source.excerpts) {
				const provider = excerpt.model_provider;
				if (!provider) continue;
				const providerCounts =
					counts.get(provider) ?? new Map<string, number>();
				providerCounts.set(type, (providerCounts.get(type) ?? 0) + 1);
				counts.set(provider, providerCounts);
			}
		}
		return [...counts.entries()].map(([provider, providerCounts]) => {
			const total = [...providerCounts.values()].reduce(
				(sum, value) => sum + value,
				0,
			);
			const row: ProviderMediaChartItem = {
				provider:
					modelSelectors.find((model) => model.value === provider)?.label ??
					provider,
			};
			for (const definition of SOURCE_MEDIA_DEFINITIONS) {
				row[definition.key] = total
					? ((providerCounts.get(definition.key) ?? 0) / total) * 100
					: 0;
			}
			return row;
		});
	}, [brandDomain, displayedSources]);

	if (!workspaceId) {
		return (
			<WorkspaceRequiredState
				icon={SearchX}
				title="Pick a Workspace"
				description="Open a workspace to inspect source influence."
			/>
		);
	}

	if (isLoading && !promptSources) {
		return (
			<div className="web-page-wide">
				<div className="web-page-wide-inner space-y-4">
					<Skeleton className="h-10 w-56" />
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						{SOURCES_METRIC_SKELETON_KEYS.map((key) => (
							<Skeleton
								key={key}
								className="h-28 rounded-[var(--app-radius)]"
							/>
						))}
					</div>
					<Skeleton className="h-[280px] rounded-[var(--app-radius)] sm:h-[380px] lg:h-[480px]" />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<TemporaryIssueState
				icon={AlertTriangle}
				title="Sources Are Unavailable"
				description="We couldn’t load citation data right now."
			/>
		);
	}

	if (!sourceStats) {
		return (
			<EmptyStatePanel
				icon={Globe2}
				title="See Who Shapes the Answer"
				description="Run prompts to reveal which domains and URLs AI models keep citing."
				examplesLabel="Source signals you'll uncover"
				examples={[
					{ icon: Globe2, label: "Top cited domains" },
					{ icon: Link2, label: "Most referenced URLs" },
					{ icon: FileText, label: "Cited text by provider" },
				]}
				action={
					<Button asChild>
						<Link href={`/prompts?workspace=${workspaceId}`}>Run prompts</Link>
					</Button>
				}
			/>
		);
	}

	const hasExportableData = displayedSources.length > 0;

	return (
		<div className="web-page-wide">
			<div className="web-page-wide-inner ui-stagger space-y-6 sm:space-y-8">
				<SectionHeading
					as="h2"
					title="信源分析"
					description="分析不同 AI 平台引用了哪些媒体，以及各类信源对品牌回答的影响。"
					titleClassName="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100"
					descriptionClassName="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400"
					trailing={
						<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
							<ExportMenu
								className="w-full sm:w-auto"
								disabled={!hasExportableData}
								onExportJson={() => {
									const concentrationRisk = getSourceConcentrationRisk(
										metrics.topDomainShare,
									);
									const citationRows = domainGroups.flatMap((group) =>
										group.urls.flatMap((source) =>
											(source.excerpts ?? []).map((excerpt) => ({
												domain: group.domain,
												url: source.url,
												title: source.title,
												urlPath: getUrlPath(source.url),
												totalCitations: source.totalSources ?? 0,
												modelProvider: excerpt.model_provider ?? "",
												citedText: excerpt.cited_text
													? cleanCitedText(excerpt.cited_text)
													: "",
											})),
										),
									);
									const topDomains = domainGroups.slice(0, 10).map((group) => ({
										domain: group.domain,
										totalCitations: group.totalCitations,
										share:
											metrics.totalCitations > 0
												? Number(
														(
															(group.totalCitations / metrics.totalCitations) *
															100
														).toFixed(1),
													)
												: 0,
										urlCount: group.urlCount,
									}));
									const domainMetricRows = domainGroups.map((group) => ({
										domain: group.domain,
										totalCitations: group.totalCitations,
										citationShare:
											metrics.totalCitations > 0
												? Number(
														(
															(group.totalCitations / metrics.totalCitations) *
															100
														).toFixed(1),
													)
												: 0,
										urlCount: group.urlCount,
										providerCount: group.providers.size,
										providers: Array.from(group.providers),
									}));
									const urlMetricRows = displayedSources.map((source) => {
										const models = getUniqueModelProviders(
											source.excerpts ?? [],
										);

										return {
											url: source.url,
											urlPath: getUrlPath(source.url),
											title: source.title,
											domain: getDomain(source.url) || "",
											totalCitations: source.totalSources ?? 0,
											citationShare:
												metrics.totalCitations > 0
													? Number(
															(
																((source.totalSources ?? 0) /
																	metrics.totalCitations) *
																100
															).toFixed(1),
														)
													: 0,
											providerCount: models.length,
											models,
											excerptCount: source.excerpts?.length ?? 0,
											citedTexts: joinCitedTexts(source.excerpts ?? [], {
												clean: true,
											}),
										};
									});

									downloadJson(`sources-${workspaceId}-${Date.now()}.json`, {
										generatedAt: new Date().toISOString(),
										workspaceId,
										report: {
											title: "Sources Intelligence Export",
											version: "2.0",
											filters: { selectedProvider, activeTab: "all" },
										},
										overview: {
											totalDomains: metrics.totalDomains,
											totalUrls: metrics.totalUrls,
											totalCitations: metrics.totalCitations,
											avgCitationsPerUrl: metrics.avgCitationsPerUrl,
										},
										impactSummary: {
											topDomain: metrics.topDomain,
											topDomainShare: `${metrics.topDomainShare}%`,
											sourceConcentrationRisk: concentrationRisk,
										},
										leaderboards: { topDomains },
										detailedData: {
											aggregate: metrics,
											domainGroups: domainMetricRows,
											sources: urlMetricRows,
											citations: citationRows,
										},
									});
								}}
								onExportCsv={() => {
									const concentrationRisk = getSourceConcentrationRisk(
										metrics.topDomainShare,
									);
									const rows = [
										{
											section: "overview",
											metric: "Domains",
											value: metrics.totalDomains,
										},
										{
											section: "overview",
											metric: "URLs",
											value: metrics.totalUrls,
										},
										{
											section: "overview",
											metric: "Citations",
											value: metrics.totalCitations,
										},
										{
											section: "overview",
											metric: "Top Domain Share",
											value: `${metrics.topDomainShare}%`,
										},
										{
											section: "overview",
											metric: "Avg Citations Per URL",
											value: metrics.avgCitationsPerUrl,
										},
										{
											section: "overview",
											metric: "Top Domain",
											value: metrics.topDomain,
										},
										{
											section: "overview",
											metric: "Source Concentration Risk",
											value: concentrationRisk,
										},
										...domainGroups.map((group) => ({
											section: "domain_performance",
											domain: group.domain,
											total_citations: group.totalCitations,
											citation_share:
												metrics.totalCitations > 0
													? Number(
															(
																(group.totalCitations /
																	metrics.totalCitations) *
																100
															).toFixed(1),
														)
													: 0,
											url_count: group.urlCount,
											provider_count: group.providers.size,
											providers: Array.from(group.providers).join(", "),
										})),
										...displayedSources.map((source) => ({
											section: "url_performance",
											url: source.url,
											url_path: getUrlPath(source.url),
											title: source.title,
											total_citations: source.totalSources ?? 0,
											citation_share:
												metrics.totalCitations > 0
													? Number(
															(
																((source.totalSources ?? 0) /
																	metrics.totalCitations) *
																100
															).toFixed(1),
														)
													: 0,
											domain: getDomain(source.url) || "",
											excerpt_count: source.excerpts?.length ?? 0,
											models: getUniqueModelProviders(
												source.excerpts ?? [],
											).join(", "),
											cited_texts: joinCitedTexts(source.excerpts ?? [], {
												clean: true,
											}),
										})),
										...domainGroups.flatMap((group) =>
											group.urls.flatMap((source) =>
												(source.excerpts ?? []).map((excerpt) => ({
													section: "source_citations",
													domain: group.domain,
													url: source.url,
													url_path: getUrlPath(source.url),
													title: source.title,
													total_citations: source.totalSources ?? 0,
													model_provider: excerpt.model_provider ?? "",
													cited_text: excerpt.cited_text
														? cleanCitedText(excerpt.cited_text)
														: "",
												})),
											),
										),
									];
									downloadCsv(`sources-${workspaceId}-${Date.now()}.csv`, rows);
								}}
							/>
						</div>
					}
				/>

				<div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-neutral-950">
					<div className="flex flex-col gap-4">
						<div className="flex flex-wrap items-center gap-2">
							<span className="mr-1 text-xs font-medium text-muted-foreground">
								监测时间
							</span>
							{DATE_PRESETS.map((preset) => (
								<button
									key={preset.value}
									type="button"
									onClick={() => setDatePreset(preset.value)}
									className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-colors ${
										datePreset === preset.value
											? "border-teal-500 bg-teal-500 text-white shadow-sm"
											: "border-gray-200 bg-white text-gray-600 hover:border-teal-300 hover:text-teal-700 dark:border-gray-800 dark:bg-neutral-950 dark:text-gray-300"
									}`}
								>
									{preset.label}
								</button>
							))}
							<div className="ml-0 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 sm:ml-2 dark:border-gray-800">
								<CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
								<input
									type="date"
									value={customStart}
									onFocus={() => setDatePreset("custom")}
									onChange={(event) => {
										setCustomStart(event.target.value);
										setDatePreset("custom");
									}}
									className="w-[118px] bg-transparent text-xs text-gray-600 outline-none dark:text-gray-300"
									aria-label="开始日期"
								/>
								<span className="text-xs text-gray-300">—</span>
								<input
									type="date"
									value={customEnd}
									onFocus={() => setDatePreset("custom")}
									onChange={(event) => {
										setCustomEnd(event.target.value);
										setDatePreset("custom");
									}}
									className="w-[118px] bg-transparent text-xs text-gray-600 outline-none dark:text-gray-300"
									aria-label="结束日期"
								/>
							</div>
						</div>

						<div className="h-px bg-gray-100 dark:bg-gray-900" />

						<div className="flex flex-wrap items-center gap-2">
							<span className="mr-1 text-xs font-medium text-muted-foreground">
								AI 平台
							</span>
							{modelSelectors.map((model) => (
								<button
									key={model.value}
									type="button"
									onClick={() => setSelectedProvider(model.value)}
									className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
										selectedProvider === model.value
											? "border-teal-500 bg-teal-500 text-white shadow-sm"
											: "border-gray-200 bg-white text-gray-600 hover:border-teal-300 hover:text-teal-700 dark:border-gray-800 dark:bg-neutral-950 dark:text-gray-300"
									}`}
								>
									{model.value === "All Models" ? (
										<Globe2 className="h-3.5 w-3.5" />
									) : (
										<img
											src={getModelFavicon(model.value)}
											alt=""
											className="h-3.5 w-3.5 rounded-sm"
										/>
									)}
									{model.value === "All Models" ? "全平台" : model.label}
								</button>
							))}
							<button
								type="button"
								onClick={() => {
									setSelectedProvider("All Models");
									setDatePreset("7d");
									setCustomStart("");
									setCustomEnd("");
								}}
								className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:text-gray-900 dark:border-gray-800 dark:hover:text-gray-100"
							>
								<RotateCcw className="h-3.5 w-3.5" />
								重置
							</button>
						</div>
					</div>
				</div>

				{displayedSources.length > 0 ? (
					<SourceAnalysisCharts
						sources={sourceChartData}
						mediaTypes={mediaTypeData}
						providers={providerMediaData}
						legend={SOURCE_MEDIA_DEFINITIONS}
					/>
				) : (
					<div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-20 text-center dark:border-gray-800 dark:bg-neutral-950">
						<SearchX className="mx-auto h-8 w-8 text-gray-300" />
						<p className="mt-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
							当前筛选范围内暂无信源数据
						</p>
						<p className="mt-1 text-xs text-muted-foreground">
							请选择其他时间或 AI 平台后重试。
						</p>
					</div>
				)}

				<div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-neutral-950">
					<h3 className="mb-4 border-l-[3px] border-teal-500 pl-3 text-base font-semibold text-gray-900 dark:text-gray-100">
						信源明细
					</h3>
					<SourcesIntelligencePanel
						metrics={metrics}
						domainRows={domainRows}
						citationDomains={citationDomains}
						enableDomainSorting
						containerVariant="plain"
						emptyTitle="当前筛选范围内暂无信源数据"
						emptySubtitle="请选择其他时间或 AI 平台后重试。"
					/>
				</div>
			</div>
		</div>
	);
}
