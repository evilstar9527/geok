"use client";

import { ExportMenu } from "@/components/export-menu";
import { downloadCsv, downloadJson } from "@/lib/export/download";
import { useLocale } from "@/lib/i18n/locale-context";
import { useSafeSearchParams } from "@/lib/navigation/use-safe-search-params";
import { api } from "@/trpc/react";
import type { AnalysisRecord, ReportData } from "@oneglanse/types";
import {
	AggregateStatsRow,
	BrandComparisonChart,
	BrandPerceptionCard,
	Button,
	CompetitiveLandscape,
	type PromptGroup,
	PromptResponsesList,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	TrendChart,
} from "@oneglanse/ui";
import {
	aggregateExposureStatistics,
	filterAnalysisRecords,
} from "@oneglanse/utils";
import {
	AlertTriangle,
	ArrowUpRight,
	ChartNoAxesCombined,
	Globe,
	LayoutGrid,
	Lightbulb,
	MessageSquare,
	RefreshCw,
	ScanEye,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useFetchAnalysedPrompts } from "../prompts/_lib/queries/prompt.queries";
import { useLayoutWorkspace } from "../workspace-context";
import {
	AnalysisOverview,
	MentionComparison,
	PanelEmptyState,
	Recommendations,
	ReportSources,
} from "./_components/analysis-panels";
import { buildReportData } from "./_utils/report";

// Components
import { DashboardFilters } from "./_components/filters";
import { DashboardSkeleton, NoWorkspaceState } from "./_components/states";
import { exportAnalysisCsv, exportAnalysisJson } from "./_utils/export";

// Hooks
import { useDashboardData } from "./_hooks/use-dashboard-data";

export default function Dashboard() {
	const router = useRouter();
	const { locale } = useLocale();
	const searchParams = useSafeSearchParams();
	const layoutWorkspace = useLayoutWorkspace();
	const workspaceId =
		searchParams.get("workspace") ?? layoutWorkspace?.id ?? "";
	const isZh = locale === "zh-CN";
	const reportId = searchParams.get("report") ?? "";
	const tabs = [
		{ value: "overview", label: isZh ? "总览" : "Overview", icon: LayoutGrid },
		{
			value: "prompts",
			label: isZh ? "提问库" : "Prompt library",
			icon: MessageSquare,
		},
		{
			value: "mentions",
			label: isZh ? "品牌提及" : "Brand mentions",
			icon: ScanEye,
		},
		{
			value: "competitors",
			label: isZh ? "竞品对比" : "Competitors",
			icon: ChartNoAxesCombined,
		},
		{ value: "sources", label: isZh ? "引用来源" : "Sources", icon: Globe },
		{
			value: "recommendations",
			label: isZh ? "优化建议" : "Recommendations",
			icon: Lightbulb,
		},
	];
	const requestedTab = searchParams.get("tab") ?? "overview";
	const activeTab = tabs.some((tab) => tab.value === requestedTab)
		? requestedTab
		: "overview";
	const updateParam = (key: string, value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		value ? params.set(key, value) : params.delete(key);
		router.push(`?${params.toString()}`, { scroll: false });
	};
	const reportsQuery = api.report.list.useQuery(
		{ workspaceId },
		{ enabled: !!workspaceId },
	);
	const selectedReport = reportsQuery.data?.find(
		(report) => report.id === reportId,
	);
	const snapshot = useMemo(() => {
		if (!selectedReport) return null;
		try {
			const data = JSON.parse(selectedReport.data) as ReportData;
			return data &&
				(data.version === 1 || data.version === 2 || data.version === 3) &&
				Array.isArray(data.mentionRates)
				? data
				: null;
		} catch {
			return null;
		}
	}, [selectedReport]);

	const {
		data: analysedPromptData,
		isLoading: isAnalysedPromptsLoading,
		error: analysedPromptError,
		refetch: refetchAnalysis,
		isFetching: isRefreshing,
	} = useFetchAnalysedPrompts(workspaceId);
	const { data: workspace } = api.workspace.getById.useQuery(
		{ workspaceId },
		{ enabled: !!workspaceId },
	);
	const isLoading = reportId
		? reportsQuery.isLoading
		: isAnalysedPromptsLoading;

	// Filters — persisted in URL so they survive navigation and are bookmarkable
	const modelFilter = searchParams.get("model") ?? "All Models";
	const timeFilter = (searchParams.get("time") ?? "all") as
		| "all"
		| "7d"
		| "14d"
		| "30d";
	const surfaceFilter = (searchParams.get("surface") ?? "all") as
		| "all"
		| "web"
		| "android_app";
	const deviceFilter = searchParams.get("device") ?? "";
	const promptFilter = searchParams.get("prompt") ?? "";
	const deviceQuery = api.device.list.useQuery(
		{ workspaceId },
		{ enabled: !!workspaceId },
	);

	const setModelFilter = (value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("model", value);
		router.push(`?${params.toString()}`, { scroll: false });
	};

	const setTimeFilter = (value: "all" | "7d" | "14d" | "30d") => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("time", value);
		router.push(`?${params.toString()}`, { scroll: false });
	};
	const setSurfaceFilter = (value: typeof surfaceFilter) => {
		const params = new URLSearchParams(searchParams.toString());
		value === "all" ? params.delete("surface") : params.set("surface", value);
		router.push(`?${params.toString()}`, { scroll: false });
	};
	const setDeviceFilter = (value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		value ? params.set("device", value) : params.delete("device");
		router.push(`?${params.toString()}`, { scroll: false });
	};
	const setPromptFilter = (value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		value ? params.set("prompt", value) : params.delete("prompt");
		router.push(`?${params.toString()}`, { scroll: false });
	};
	const promptOptions = useMemo(() => {
		const options = new Map<string, string>();
		for (const record of analysedPromptData ?? []) {
			if (!options.has(record.prompt_id))
				options.set(record.prompt_id, record.prompt);
		}
		return Array.from(options, ([id, text]) => ({ id, text }));
	}, [analysedPromptData]);

	// Computed data
	const metrics = useDashboardData(
		analysedPromptData ?? [],
		modelFilter,
		timeFilter,
		{
			name: workspace?.name,
			domain: workspace?.domain,
		},
		{
			surfaceFilter,
			deviceId: deviceFilter || undefined,
			promptId: promptFilter || undefined,
		},
	);
	const collectionRecords = useMemo(
		() =>
			filterAnalysisRecords(analysedPromptData ?? [], {
				modelFilter,
				timeFilter,
				surfaceFilter,
				deviceId: deviceFilter || undefined,
				promptId: promptFilter || undefined,
			}),
		[
			analysedPromptData,
			modelFilter,
			timeFilter,
			surfaceFilter,
			deviceFilter,
			promptFilter,
		],
	);
	const exposureStats = useMemo(() => {
		const stats = aggregateExposureStatistics(
			collectionRecords.map((record) => ({
				runId: record.run_id,
				exposureEvaluated: record.exposure_evaluated,
				exposureMatches: record.exposure_matches,
				status: record.collection_status,
			})),
		);
		return {
			...stats,
			exposureRate: Math.round(stats.exposureRate * 100),
			completionRate: Math.round(stats.completionRate * 100),
		};
	}, [collectionRecords]);
	const liveReport = useMemo(() => {
		const data = buildReportData(metrics);
		return {
			...data,
			mentionRates: data.mentionRates.map((entry) => ({
				...entry,
				mentionRate: data.totalResponses
					? (entry.appearances / data.totalResponses) * 100
					: 0,
			})),
			sourcesIntelligence: metrics.sourcesIntelligence.map((source) => ({
				domain: source.domain,
				favicon: source.favicon,
				citationCount: source.citationCount,
				models: [...source.models],
			})),
		};
	}, [metrics]);

	const report = snapshot ?? liveReport;
	const hasExportableData = snapshot
		? snapshot.totalResponses > 0
		: collectionRecords.length > 0;

	// Change vs the previous period, in each metric's own units. `rank` is passed
	// through with its real sign (a lower number is better) — the tile decides how
	// to colour it. Both are null when the range is "all time".
	const presenceRateDelta = metrics.previousPeriod
		? metrics.aggregateStats.presenceRate - metrics.previousPeriod.presenceRate
		: null;
	const rankDelta =
		metrics.previousPeriod?.rank != null && metrics.avgRank.position != null
			? metrics.avgRank.position - metrics.previousPeriod.rank
			: null;

	// Build prompt groups for the responses list section
	const promptGroups = useMemo((): PromptGroup[] => {
		if (!analysedPromptData) return [];
		const filtered = filterAnalysisRecords(analysedPromptData, {
			modelFilter,
			timeFilter,
			surfaceFilter,
			deviceId: deviceFilter || undefined,
			promptId: promptFilter || undefined,
		});
		const groupMap = new Map<
			string,
			{ promptText: string; rows: AnalysisRecord[] }
		>();
		for (const record of filtered) {
			const existing = groupMap.get(record.prompt_id);
			if (existing) {
				existing.rows.push(record);
			} else {
				groupMap.set(record.prompt_id, {
					promptText: record.prompt,
					rows: [record],
				});
			}
		}
		return Array.from(groupMap.entries()).map(
			([promptId, { promptText, rows }]) => ({
				promptId,
				promptText,
				rows: rows.map((r) => ({
					id: r.id,
					modelProvider: r.model_provider,
					promptRunAt: r.prompt_run_at,
					response: r.response,
					isAnalysed: r.is_analysed ?? false,
					failureReason: r.failure_reason,
					sources: (r.sources ?? []).map((s) => ({
						title: s.title,
						url: s.url,
					})),
					metrics:
						r.is_analysed && r.brand_analysis
							? {
									geoScore: r.brand_analysis.geoScore?.overall ?? 0,
									sentiment: r.brand_analysis.sentiment?.score ?? 0,
									visibility: r.brand_analysis.presence?.visibility ?? 0,
									position: r.brand_analysis.position?.rankPosition ?? null,
								}
							: undefined,
				})),
			}),
		);
	}, [
		analysedPromptData,
		modelFilter,
		timeFilter,
		surfaceFilter,
		deviceFilter,
		promptFilter,
	]);

	const mentionedGroups = useMemo(() => {
		const ids = new Set(
			metrics.analyzedRecords
				.filter((record) => record.brand_analysis?.presence?.mentioned)
				.map((record) => record.id),
		);
		return promptGroups
			.map((group) => ({
				...group,
				rows: group.rows.filter((row) => ids.has(row.id)),
			}))
			.filter((group) => group.rows.length > 0);
	}, [metrics.analyzedRecords, promptGroups]);
	const perception = report.brandPerception;
	const hasPerception =
		perception &&
		(perception.bestKnownFor ||
			perception.coreClaims.length ||
			perception.differentiators.length ||
			perception.pricingPerception !== "not_mentioned");

	if (!workspaceId) return <NoWorkspaceState />;
	const snapshotDetails = isZh
		? "历史报告展示生成时保存的数据，不支持按时间或引擎重新筛选。完整内容可在原报告中查看。"
		: "Historical reports show saved data and cannot be filtered by time or engine. Open the original report for its full contents.";
	const hasError = reportId
		? reportsQuery.error || (!isLoading && !snapshot)
		: analysedPromptError;
	const emptyDetails = isZh
		? "当前筛选范围内暂无数据，可调整筛选或采集新的回答。"
		: "No data for these filters. Adjust the filters or collect more responses.";

	return (
		<div className="web-page-wide">
			<div className="mx-auto w-full min-w-0 max-w-[1440px] space-y-6 px-4 py-6 sm:px-7 lg:px-10 lg:py-8">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="mb-2 text-xs font-medium tracking-widest text-gray-400">
							GEO {isZh ? "品牌洞察" : "INTELLIGENCE"}
						</p>
						<h2 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-gray-50">
							{isZh ? "品牌数据分析" : "Brand analytics"}
						</h2>
						<p className="mt-2 text-sm text-gray-500">
							{isZh
								? "了解品牌在 AI 回答中的表现，发现下一步增长机会。"
								: "Understand your brand in AI answers and discover opportunities to grow."}
						</p>
					</div>
					<ExportMenu
						disabled={!hasExportableData || !!hasError || isLoading}
						onExportJson={() =>
							snapshot
								? downloadJson(`report-${reportId}.json`, snapshot)
								: exportAnalysisJson({
										workspaceId,
										metrics,
										records: collectionRecords,
										modelFilter,
										timeFilter,
									})
						}
						onExportCsv={() =>
							snapshot
								? downloadCsv(
										`report-${reportId}.csv`,
										snapshot.mentionRates.map((entry) => ({ ...entry })),
									)
								: exportAnalysisCsv({
										workspaceId,
										metrics,
										records: collectionRecords,
									})
						}
					/>
				</div>
				<Tabs
					value={activeTab}
					onValueChange={(value) => updateParam("tab", value)}
					className="gap-6"
				>
					<div className="max-w-full overflow-x-auto pb-1">
						<TabsList
							aria-label={isZh ? "数据分析栏目" : "Analytics sections"}
							className="h-auto w-max gap-1 rounded-full border border-gray-200/70 bg-stone-100/80 p-1.5 dark:border-gray-800 dark:bg-neutral-900"
						>
							{tabs.map(({ value, label, icon: Icon }) => (
								<TabsTrigger
									key={value}
									value={value}
									className="h-10 flex-none gap-2 rounded-full px-5 text-gray-500 focus-visible:ring-2 focus-visible:ring-violet-400 data-[state=active]:bg-gray-950 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-950"
								>
									<Icon className="size-4" />
									{label}
								</TabsTrigger>
							))}
						</TabsList>
					</div>
					<section
						className="space-y-4 rounded-2xl border border-gray-200/70 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-neutral-950"
						aria-label={isZh ? "数据筛选" : "Data filters"}
					>
						<div className="flex flex-wrap items-center gap-3">
							<label
								htmlFor="dashboard-report"
								className="text-sm text-gray-500"
							>
								{isZh ? "数据范围" : "Data source"}
							</label>
							<select
								id="dashboard-report"
								value={reportId}
								onChange={(event) => updateParam("report", event.target.value)}
								className="h-10 max-w-full min-w-0 rounded-full border border-gray-200 bg-stone-50 px-4 text-sm dark:border-gray-700 dark:bg-neutral-900"
							>
								<option value="">
									{isZh
										? "当前数据 · 全部采集记录"
										: "Current data · Collected responses"}
								</option>
								{reportId && !selectedReport && (
									<option value={reportId}>
										{isZh ? "历史报告" : "Historical report"}
									</option>
								)}
								{reportsQuery.data?.map((item) => (
									<option key={item.id} value={item.id}>
										{isZh ? "历史报告" : "Report"} · {item.brandName} ·{" "}
										{new Date(item.createdAt).toLocaleString(
											isZh ? "zh-CN" : "en-US",
										)}
									</option>
								))}
							</select>
							<Button
								variant="ghost"
								size="sm"
								disabled={isRefreshing || reportsQuery.isFetching}
								onClick={() => {
									void refetchAnalysis();
									void reportsQuery.refetch();
								}}
								className="gap-2 text-gray-500"
							>
								<RefreshCw
									className={`size-3.5 ${isRefreshing || reportsQuery.isFetching ? "animate-spin" : ""}`}
								/>
								{isZh ? "刷新数据" : "Refresh"}
							</Button>
							<Link
								href={`/reports?workspace=${workspaceId}`}
								className="ml-auto inline-flex items-center gap-1 text-xs text-gray-500 hover:text-violet-600"
							>
								{isZh ? "全部报告" : "All reports"}
								<ArrowUpRight className="size-3.5" />
							</Link>
							{snapshot && (
								<Link
									href={`/report/${reportId}`}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-1 text-xs text-violet-600"
								>
									{isZh ? "查看原报告" : "View report"}
									<ArrowUpRight className="size-3.5" />
								</Link>
							)}
						</div>
						{reportId ? (
							<p className="rounded-xl bg-stone-50 px-4 py-3 text-xs leading-6 text-gray-500 dark:bg-neutral-900">
								{snapshotDetails}
							</p>
						) : (
							<div className="border-t border-gray-100 pt-4 dark:border-gray-800">
								<DashboardFilters
									brandName={metrics.brandName}
									brandDomain={metrics.brandDomain}
									modelFilter={modelFilter}
									setModelFilter={setModelFilter}
									timeFilter={timeFilter}
									setTimeFilter={setTimeFilter}
									surfaceFilter={surfaceFilter}
									setSurfaceFilter={setSurfaceFilter}
									deviceFilter={deviceFilter}
									setDeviceFilter={setDeviceFilter}
									devices={
										deviceQuery.data?.map((device) => ({
											id: device.id,
											name: device.name,
										})) ?? []
									}
									promptFilter={promptFilter}
									setPromptFilter={setPromptFilter}
									prompts={promptOptions}
								/>
							</div>
						)}
						{reportsQuery.isError && !reportId && (
							<p className="text-xs text-amber-600" aria-live="polite">
								{isZh
									? "历史报告暂时无法加载，当前采集数据仍可查看。"
									: "Reports are unavailable. Current data is still available."}
							</p>
						)}
					</section>
					{hasError ? (
						<div
							role="alert"
							className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800"
						>
							<AlertTriangle className="mb-2 size-5" />
							{isZh
								? "暂时无法加载所选数据，请刷新重试或选择其他数据范围。"
								: "Unable to load the selected data. Refresh or choose another source."}
						</div>
					) : isLoading ? (
						<DashboardSkeleton />
					) : (
						<>
							<TabsContent value="overview" className="space-y-5">
								<AnalysisOverview
									report={report}
									records={snapshot ? null : metrics.analyzedRecords}
									locale={locale}
								/>
								{!snapshot && (
									<TrendChart data={metrics.trend} locale={locale} />
								)}
								{!snapshot && collectionRecords.length > 0 && (
									<div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
										{[
											[isZh ? "曝光次数" : "Exposures", exposureStats.exposed],
											[
												isZh ? "曝光率" : "Exposure rate",
												`${exposureStats.exposureRate}%`,
											],
											[
												isZh ? "成功回答" : "Successful",
												exposureStats.successful,
											],
											[isZh ? "计划数" : "Planned", exposureStats.planned],
											[isZh ? "失败数" : "Failed", exposureStats.failed],
											[
												isZh ? "完成率" : "Completion",
												`${exposureStats.completionRate}%`,
											],
										].map(([label, value]) => (
											<div
												key={label}
												className="rounded-2xl border border-gray-200/70 bg-white p-4 dark:border-gray-800 dark:bg-neutral-950"
											>
												<p className="text-xs text-gray-500">{label}</p>
												<p className="mt-2 text-xl font-semibold">{value}</p>
											</div>
										))}
									</div>
								)}
							</TabsContent>
							<TabsContent value="prompts" className="space-y-4">
								<div className="flex items-center justify-between">
									<h3 className="font-semibold">
										{isZh ? "提问与回答" : "Prompts and responses"}
									</h3>
									<Link
										className="inline-flex items-center gap-1 text-sm text-violet-600"
										href={`/prompts?workspace=${workspaceId}`}
									>
										{isZh ? "管理提问" : "Manage prompts"}
										<ArrowUpRight className="size-4" />
									</Link>
								</div>
								{snapshot ? (
									<PanelEmptyState text={snapshotDetails} />
								) : promptGroups.length ? (
									<PromptResponsesList locale={locale} groups={promptGroups} />
								) : (
									<PanelEmptyState text={emptyDetails} />
								)}
							</TabsContent>
							<TabsContent value="mentions" className="space-y-5">
								<MentionComparison report={report} locale={locale} onlyBrand />
								{hasPerception && (
									<BrandPerceptionCard locale={locale} {...perception} />
								)}
								{snapshot ? (
									<PanelEmptyState text={snapshotDetails} />
								) : mentionedGroups.length ? (
									<PromptResponsesList
										locale={locale}
										groups={mentionedGroups}
									/>
								) : (
									<PanelEmptyState
										text={
											isZh
												? "当前筛选范围内暂无提及品牌的回答"
												: "No responses mention this brand in the selected range"
										}
									/>
								)}
							</TabsContent>
							<TabsContent value="competitors" className="space-y-5">
								{!snapshot && metrics.analyzedRecords.length > 0 && (
									<AggregateStatsRow
										locale={locale}
										presenceRate={metrics.aggregateStats.presenceRate}
										rank={metrics.avgRank.position}
										topSource={metrics.sourcesIntelligence[0]?.domain ?? "N/A"}
										topCompetitor={metrics.aggregateStats.topCompetitor}
										topCompetitorDomain={
											metrics.aggregateStats.topCompetitorDomain ?? undefined
										}
										presenceRateDelta={presenceRateDelta}
										rankDelta={rankDelta}
									/>
								)}
								<MentionComparison report={report} locale={locale} />
								{!snapshot &&
									metrics.competitorData.some((entry) => !entry.isBrand) && (
										<>
											<CompetitiveLandscape
												competitors={metrics.competitorData}
											/>
											<BrandComparisonChart
												competitors={metrics.competitorData}
												brandName={metrics.brandName}
												totalResponses={metrics.impactMetrics.totalResponses}
												brandPresenceRate={metrics.aggregateStats.presenceRate}
												brandRecommendationRate={
													metrics.impactMetrics.recommendationRate
												}
												brandSentimentScore={metrics.avgSentiment.score}
												brandAvgRank={metrics.avgRank.position}
											/>
										</>
									)}
							</TabsContent>
							<TabsContent value="sources">
								<ReportSources report={report} locale={locale} />
							</TabsContent>
							<TabsContent value="recommendations">
								<Recommendations
									report={report}
									workspaceId={workspaceId}
									locale={locale}
								/>
							</TabsContent>
						</>
					)}
				</Tabs>
			</div>
		</div>
	);
}
