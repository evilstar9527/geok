"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { useSafeSearchParams } from "@/lib/navigation/use-safe-search-params";
import { api } from "@/trpc/react";
import { ExternalLink, FileBarChart2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { GenerateReportButton } from "../dashboard/_components/generate-report";
import { useDashboardData } from "../dashboard/_hooks/use-dashboard-data";
import { buildReportData } from "../dashboard/_utils/report";
import { useFetchAnalysedPrompts } from "../prompts/_lib/queries/prompt.queries";
import { useIsAdministrator } from "../workspace-context";

function formatReportDate(value: Date | string, locale: string): string {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	return date.toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function ReportsPage() {
	const { locale, t } = useLocale();
	const searchParams = useSafeSearchParams();
	const workspaceId = searchParams.get("workspace") ?? "";
	const isAdministrator = useIsAdministrator();

	const { data: analysedPromptData } = useFetchAnalysedPrompts(workspaceId);
	const { data: workspace } = api.workspace.getById.useQuery(
		{ workspaceId },
		{ enabled: !!workspaceId },
	);
	const reportsQuery = api.report.list.useQuery(
		{ workspaceId },
		{ enabled: !!workspaceId },
	);

	const metrics = useDashboardData(
		analysedPromptData ?? [],
		"All Models",
		"all",
		{ name: workspace?.name, domain: workspace?.domain },
	);
	const reportData = useMemo(() => buildReportData(metrics), [metrics]);
	const hasAnalysedData = metrics.analyzedRecords.length > 0;
	const reports = reportsQuery.data ?? [];

	return (
		<div className="web-page-wide">
			<div className="web-page-wide-inner">
				<div className="ui-stagger space-y-5 sm:space-y-6">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<p className="max-w-xl text-sm text-gray-500 dark:text-gray-400">
							{t(
								"Generate a public, shareable report comparing your brand's mention rate with competitors.",
							)}
						</p>
						{isAdministrator ? (
							<GenerateReportButton
								workspaceId={workspaceId}
								reportData={reportData}
								disabled={!hasAnalysedData}
							/>
						) : null}
					</div>

					<section>
						<h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
							{t("Generated Reports")}
						</h2>

						<div className="mt-3">
							{reportsQuery.isLoading ? (
								<p className="text-sm text-gray-500 dark:text-gray-400">
									{t("Loading...")}
								</p>
							) : reports.length === 0 ? (
								<div className="rounded-[var(--app-radius)] border border-dashed border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-neutral-950">
									<FileBarChart2 className="mx-auto h-6 w-6 text-gray-300 dark:text-gray-700" />
									<p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
										{t("No reports yet")}
									</p>
								</div>
							) : (
								<ul className="space-y-2">
									{reports.map((report) => (
										<li key={report.id}>
											<Link
												href={`/report/${report.id}`}
												target="_blank"
												rel="noreferrer"
												className="flex items-center gap-3 rounded-[var(--app-radius)] border border-gray-200/80 bg-white p-4 transition-colors hover:bg-stone-50 dark:border-gray-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
											>
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
														{report.brandName}
													</p>
													<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
														{formatReportDate(report.createdAt, locale)}
													</p>
												</div>
												<ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
											</Link>
										</li>
									))}
								</ul>
							)}
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
