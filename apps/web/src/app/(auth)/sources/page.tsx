"use client";

import { ExportMenu } from "@/components/export-menu";
import { HorizontalFilterStrip } from "@/components/horizontal-filter-strip";
import { downloadCsv, downloadJson } from "@/lib/export/download";
import { useLocale } from "@/lib/i18n/locale-context";
import { useSafeSearchParams } from "@/lib/navigation/use-safe-search-params";
import type {
	GroupedSource,
	Provider,
	SourceGroupResult,
} from "@oneglanse/types";
import {
	Button,
	EmptyStatePanel,
	SectionHeading,
	Skeleton,
	type SourcePanelCitationDomain,
	type SourcePanelDomainRow,
	type SourcePanelMetrics,
	SourcesIntelligencePanel,
	TemporaryIssueState,
	WorkspaceRequiredState,
} from "@oneglanse/ui";
import {
	type MediaTypeChartItem,
	type ProviderMediaChartItem,
	SourceAnalysisCharts,
	type SourceDistributionChartItem,
} from "@oneglanse/ui/source-analysis-charts";
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
	Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
	usePromptSources,
	useUserPrompts,
} from "../prompts/_lib/queries/prompt.queries";
import { useIsAdministrator, useLayoutWorkspace } from "../workspace-context";

type DomainGroup = {
	domain: string;
	totalCitations: number;
	urlCount: number;
	providers: Set<string>;
	urls: GroupedSource[];
};

type DatePreset = "all" | "yesterday" | "7d" | "30d" | "custom";

const ALL_PROMPTS = "__all__";
const PENDING_PROMPT = "__pending__";

const DATE_PRESETS: Array<{
	value: DatePreset;
	labelZh: string;
	labelEn: string;
}> = [
	{ value: "yesterday", labelZh: "昨天", labelEn: "Yesterday" },
	{ value: "7d", labelZh: "最近一周", labelEn: "Last 7 days" },
	{ value: "30d", labelZh: "最近一月", labelEn: "Last 30 days" },
	{ value: "all", labelZh: "全部时间", labelEn: "All time" },
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
	const { locale } = useLocale();
	const isZh = locale === "zh-CN";
	const [selectedProvider, setSelectedProvider] = useState<
		Provider | "All Models"
	>("All Models");
	const [datePreset, setDatePreset] = useState<DatePreset>("7d");
	const [customStart, setCustomStart] = useState("");
	const [customEnd, setCustomEnd] = useState("");
	const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

	const searchParams = useSafeSearchParams();
	const workspaceId = searchParams.get("workspace") ?? "";
	const activeWorkspace = useLayoutWorkspace();
	const isAdministrator = useIsAdministrator();
	const promptsQuery = useUserPrompts(workspaceId);
	const orderedPrompts = useMemo(
		() =>
			[...(promptsQuery.data ?? [])].sort(
				(left, right) =>
					new Date(right.created_at).getTime() -
					new Date(left.created_at).getTime(),
			),
		[promptsQuery.data],
	);

	useEffect(() => {
		setSelectedPromptId(workspaceId ? null : ALL_PROMPTS);
	}, [workspaceId]);

	useEffect(() => {
		if (selectedPromptId !== null || promptsQuery.isLoading) return;
		setSelectedPromptId(orderedPrompts[0]?.id ?? ALL_PROMPTS);
	}, [orderedPrompts, promptsQuery.isLoading, selectedPromptId]);
	const brandDomain =
		activeWorkspace?.id === workspaceId ? activeWorkspace.domain : undefined;
	const dateRange = useMemo(
		() => getDateRange(datePreset, customStart, customEnd),
		[datePreset, customStart, customEnd],
	);
	const selectedPrompt = orderedPrompts.find(
		(prompt) => prompt.id === selectedPromptId,
	);
	const promptScopeLabel =
		selectedPromptId === ALL_PROMPTS
			? isZh
				? "全部提示词"
				: "All prompts"
			: (selectedPrompt?.prompt ?? (isZh ? "提示词加载中" : "Loading prompt"));
	const {
		data: promptSources,
		isLoading,
		error,
	} = usePromptSources(workspaceId, {
		...dateRange,
		modelProvider:
			selectedProvider === "All Models" ? undefined : selectedProvider,
		promptId:
			selectedPromptId === ALL_PROMPTS
				? undefined
				: (selectedPromptId ?? PENDING_PROMPT),
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
	const hasResponsesWithoutSources =
		displayedSources.length === 0 && (promptSources?.responseCount ?? 0) > 0;

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
				providers: [...group.providers],
				urls: group.urls.slice(0, 5).map((source) => ({
					title: source.title,
					url: source.url,
					citations: source.totalSources ?? 0,
				})),
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
				providers: [],
				urls: [],
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
				title="选择工作区"
				description="打开工作区，查看信源影响力。"
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
				title="信源数据暂不可用"
				description="暂时无法加载引用数据。"
			/>
		);
	}

	if (!sourceStats) {
		return (
			<EmptyStatePanel
				icon={Globe2}
				title="查看哪些信源影响回答"
				description="运行提问，查看人工智能平台持续引用的网站和页面。"
				examplesLabel="可查看的信源指标"
				examples={[
					{ icon: Globe2, label: "主要引用网站" },
					{ icon: Link2, label: "高频引用页面" },
					{ icon: FileText, label: "各平台引用原文" },
				]}
				action={
					<Button asChild>
						<Link href={`/prompts?workspace=${workspaceId}`}>运行提问</Link>
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
					title={isZh ? "引用来源分析" : "Source Analysis"}
					description={
						isZh
							? "分析不同 AI 平台引用了哪些媒体，以及各类信源对品牌回答的影响。"
							: "See which media sources AI platforms cite and how they shape brand answers."
					}
					titleClassName="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100"
					descriptionClassName="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400"
					trailing={
						<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
							{isAdministrator &&
								selectedPromptId !== null &&
								selectedPromptId !== ALL_PROMPTS && (
									<Button
										asChild
										variant="secondary"
										className="w-full sm:w-auto"
									>
										<Link
											href={`/pr?workspace=${workspaceId}&promptId=${selectedPromptId}`}
										>
											<Sparkles className="mr-1 size-4" />
											{isZh ? "生成 PR 稿" : "Draft PR article"}
										</Link>
									</Button>
								)}
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
											title: "信源分析报告",
											version: "2.0",
											filters: {
												selectedProvider,
												datePreset,
												startAt: dateRange.startAt ?? null,
												endAt: dateRange.endAt ?? null,
												promptId:
													selectedPromptId === ALL_PROMPTS
														? null
														: selectedPromptId,
												prompt: selectedPrompt?.prompt ?? null,
											},
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
											metric: "首位信源引用占比",
											value: `${metrics.topDomainShare}%`,
										},
										{
											section: "overview",
											metric: "每页平均引用次数",
											value: metrics.avgCitationsPerUrl,
										},
										{
											section: "overview",
											metric: "首位信源",
											value: metrics.topDomain,
										},
										{
											section: "overview",
											metric: "信源集中度风险",
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

				<div className="app-panel rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-neutral-950">
					<div className="flex flex-col gap-4">
						<div className="flex items-center gap-3">
							<label
								htmlFor="source-prompt-filter"
								className="shrink-0 text-xs font-medium text-muted-foreground"
							>
								{isZh ? "提示词" : "Prompt"}
							</label>
							<select
								id="source-prompt-filter"
								value={selectedPromptId ?? ""}
								onChange={(event) => setSelectedPromptId(event.target.value)}
								disabled={promptsQuery.isLoading || orderedPrompts.length === 0}
								className="app-control h-10 min-w-0 flex-1 truncate rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-[var(--geo-title)] dark:border-gray-800 dark:bg-neutral-950 dark:text-gray-200"
							>
								<option value={ALL_PROMPTS}>
									{isZh ? "全部提示词（总览）" : "All prompts (overview)"}
								</option>
								{orderedPrompts.map((prompt) => (
									<option key={prompt.id} value={prompt.id}>
										{prompt.prompt}
									</option>
								))}
							</select>
						</div>

						<div className="h-px bg-gray-100 dark:bg-gray-900" />

						<div className="flex flex-wrap items-center gap-2">
							<span className="mr-1 text-xs font-medium text-muted-foreground">
								{isZh ? "监测时间" : "Time range"}
							</span>
							{DATE_PRESETS.map((preset) => (
								<button
									key={preset.value}
									type="button"
									onClick={() => setDatePreset(preset.value)}
									aria-pressed={datePreset === preset.value}
									data-active={datePreset === preset.value}
									className={`geo-pill rounded-full border px-3.5 py-2 text-xs font-medium transition-colors ${
										datePreset === preset.value
											? "border-[var(--geo-accent)] bg-[var(--geo-accent)] text-[var(--geo-on-accent)] shadow-sm"
											: "border-gray-200 bg-white text-gray-600 hover:border-[var(--geo-title)] hover:text-[var(--geo-title)] dark:border-gray-800 dark:bg-neutral-950 dark:text-gray-300"
									}`}
								>
									{isZh ? preset.labelZh : preset.labelEn}
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

						<div className="flex min-w-0 items-center gap-2">
							<span className="mr-1 shrink-0 text-xs font-medium text-muted-foreground">
								{isZh ? "AI 平台" : "AI platform"}
							</span>
							<HorizontalFilterStrip>
								{modelSelectors.map((model) => (
									<button
										key={model.value}
										type="button"
										onClick={() => setSelectedProvider(model.value)}
										aria-pressed={selectedProvider === model.value}
										data-active={selectedProvider === model.value}
										className={`geo-pill inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
											selectedProvider === model.value
												? "border-[var(--geo-accent)] bg-[var(--geo-accent)] text-[var(--geo-on-accent)] shadow-sm"
												: "border-gray-200 bg-white text-gray-600 hover:border-[var(--geo-title)] hover:text-[var(--geo-title)] dark:border-gray-800 dark:bg-neutral-950 dark:text-gray-300"
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
										{model.value === "All Models"
											? isZh
												? "全平台"
												: "All platforms"
											: model.label}
									</button>
								))}
							</HorizontalFilterStrip>
							<button
								type="button"
								onClick={() => {
									setSelectedProvider("All Models");
									setDatePreset("7d");
									setCustomStart("");
									setCustomEnd("");
									setSelectedPromptId(orderedPrompts[0]?.id ?? ALL_PROMPTS);
								}}
								className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:text-gray-900 dark:border-gray-800 dark:hover:text-gray-100"
							>
								<RotateCcw className="h-3.5 w-3.5" />
								{isZh ? "重置" : "Reset"}
							</button>
						</div>
					</div>
				</div>

				{Boolean(promptSources?.referenceSummaries?.length) && (
					<section
						className="app-panel rounded-xl border border-gray-200/80 p-5 dark:border-gray-800"
						aria-label={
							isZh ? "平台参考资料记录" : "Platform reference records"
						}
					>
						<h3 className="text-base font-semibold">
							{isZh ? "平台参考资料记录" : "Platform reference records"}
						</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							{isZh
								? "平台页面显示的参考资料数量，按回答累计、未去重，不等于实际引用次数，不计入下方来源域名和页面统计。"
								: "Counts displayed by each platform, summed across answers without deduplication. These are not citation counts and do not add to the domain or page totals below."}
						</p>
						<div className="mt-4 grid gap-4 md:grid-cols-2">
							{promptSources?.referenceSummaries?.map((record) => (
								<div
									key={record.provider}
									className="rounded-xl border border-gray-200/70 p-4 dark:border-gray-800"
								>
									<h4 className="font-semibold">
										{record.provider === "doubao"
											? isZh
												? "豆包"
												: "Doubao"
											: isZh
												? "点点"
												: "Diandian"}
									</h4>
									<p className="mt-2 text-sm">
										{isZh
											? `已记录资料数量的回答：${record.recordedResponses} / ${record.responses} 条`
											: `Answers with recorded counts: ${record.recordedResponses} / ${record.responses}`}
									</p>
									{record.recordedResponses > 0 ? (
										<>
											<p className="mt-2 text-2xl font-semibold">
												{record.reportedTotal.toLocaleString()}{" "}
												<span className="text-sm font-normal">
													{isZh
														? "篇次（未去重）"
														: "reference occurrences (not deduplicated)"}
												</span>
											</p>
											<p className="mt-1 text-sm">
												{isZh
													? `每条有记录的回答显示 ${record.min}–${record.max} 篇资料；其中 ${record.responsesWithoutLinks} 条链接未采集。`
													: `Recorded answers display ${record.min}–${record.max} references each; ${record.responsesWithoutLinks} have no captured links.`}
											</p>
											<p className="mt-2 text-xs text-muted-foreground">
												{isZh
													? "原页面提示示例："
													: "Example platform labels: "}
												{record.badges.join("；")}
											</p>
										</>
									) : (
										<p className="mt-2 text-sm">
											{isZh
												? "资料数量未采集，不能视为 0。"
												: "Reference counts were not captured; this does not mean zero."}
										</p>
									)}
									{record.responses > record.recordedResponses && (
										<p className="mt-2 text-xs text-muted-foreground">
											{isZh
												? `另有 ${record.responses - record.recordedResponses} 条回答的资料数量未采集。`
												: `Counts are missing for ${record.responses - record.recordedResponses} other answers.`}
										</p>
									)}
								</div>
							))}
						</div>
					</section>
				)}

				{promptSources?.sourceCoverage &&
					(promptSources.sourceCoverage.snapshotRecovered > 0 ||
						promptSources.sourceCoverage.notCaptured > 0) && (
						<div
							aria-live="polite"
							className="app-panel rounded-xl border border-amber-200 px-5 py-4 text-sm leading-6"
						>
							{isZh
								? `来源采集不完整：${promptSources.sourceCoverage.snapshotRecovered} 条回答已从原始页面快照恢复可见参考链接，${promptSources.sourceCoverage.notCaptured} 条回答未保存可恢复的链接。下方统计仅覆盖已获取的链接，包含平台展示的搜索参考资料，不代表完整引用量；缺失不等于未引用。`
								: `Source capture is incomplete: visible reference links were recovered from ${promptSources.sourceCoverage.snapshotRecovered} response snapshots; ${promptSources.sourceCoverage.notCaptured} responses have no recoverable links saved. Statistics cover captured links, including displayed search references, not the full citation count. Missing capture does not mean no citations.`}
						</div>
					)}
				{displayedSources.length > 0 ? (
					<SourceAnalysisCharts
						locale={locale}
						scopeLabel={promptScopeLabel}
						sources={sourceChartData}
						mediaTypes={mediaTypeData}
						providers={providerMediaData}
						legend={SOURCE_MEDIA_DEFINITIONS}
					/>
				) : (
					<div className="app-panel rounded-xl border border-dashed border-gray-200 bg-white px-6 py-20 text-center dark:border-gray-800 dark:bg-neutral-950">
						<SearchX className="mx-auto h-8 w-8 text-gray-300" />
						<p className="mt-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
							{hasResponsesWithoutSources
								? isZh
									? "已有回答，但尚未获取到引用链接"
									: "Responses exist, but no source links have been captured"
								: isZh
									? "当前筛选范围内暂无信源数据"
									: "No source data for these filters"}
						</p>
						<p className="mt-1 text-xs text-muted-foreground">
							{hasResponsesWithoutSources
								? isZh
									? `本次有 ${promptSources?.responseCount ?? 0} 条回答；当前保存的来源链接为空，不能据此判断 AI 没有引用资料。请在总览中查看回答正文。`
									: `${promptSources?.responseCount ?? 0} responses were captured. Missing source links do not prove the AI used no references. View the answers on the dashboard.`
								: isZh
									? "请选择其他时间或 AI 平台后重试。"
									: "Try another time range or AI platform."}
						</p>
					</div>
				)}

				<div className="app-panel rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-neutral-950">
					<h3 className="mb-4 border-l-[3px] border-[var(--geo-title)] pl-3 text-base font-semibold text-gray-900 dark:text-gray-100">
						{isZh ? "信源明细" : "Source details"}
					</h3>
					<SourcesIntelligencePanel
						locale={locale}
						metrics={metrics}
						domainRows={domainRows}
						citationDomains={citationDomains}
						enableDomainSorting
						containerVariant="plain"
						emptyTitle={
							hasResponsesWithoutSources
								? isZh
									? "已有回答，引用链接尚未获取"
									: "Responses exist; source links have not been captured"
								: isZh
									? "当前筛选范围内暂无信源数据"
									: "No source data for these filters"
						}
						emptySubtitle={
							hasResponsesWithoutSources
								? isZh
									? "请在总览中查看回答正文。"
									: "View response content on the dashboard."
								: isZh
									? "请选择其他时间或 AI 平台后重试。"
									: "Try another time range or AI platform."
						}
					/>
				</div>
			</div>
		</div>
	);
}
