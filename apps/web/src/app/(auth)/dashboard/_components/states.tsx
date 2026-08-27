"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import {
	Button,
	EmptyStatePanel,
	Skeleton,
	WorkspaceRequiredState,
} from "@oneglanse/ui";
import { BarChart3, Building2, Link2, Trophy, Users } from "lucide-react";
import Link from "next/link";

const DASHBOARD_SKELETON_KEYS = [
	"dashboard-skeleton-a",
	"dashboard-skeleton-b",
	"dashboard-skeleton-c",
	"dashboard-skeleton-d",
] as const;

export function DashboardSkeleton() {
	return (
		<div className="web-page-wide">
			<div className="web-page-wide-inner py-4">
				<div className="space-y-6">
					<div className="flex items-center gap-3">
						<Skeleton className="h-9 w-44 rounded-[var(--app-radius)]" />
						<Skeleton className="h-9 w-44 rounded-[var(--app-radius)]" />
						<Skeleton className="h-9 w-40 rounded-[var(--app-radius)]" />
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						{DASHBOARD_SKELETON_KEYS.map((key) => (
							<div
								key={key}
								className="rounded-[var(--app-radius)] border border-gray-100/80 bg-white p-4 dark:border-gray-800 dark:bg-neutral-950"
							>
								<Skeleton className="h-3 w-20 rounded" />
								<Skeleton className="mt-4 h-8 w-24 rounded" />
								<Skeleton className="mt-3 h-3 w-40 rounded" />
							</div>
						))}
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<Skeleton className="h-[280px] rounded-[var(--app-radius)] sm:h-[380px] lg:h-[500px]" />
						<Skeleton className="h-[280px] rounded-[var(--app-radius)] sm:h-[380px] lg:h-[500px]" />
						<Skeleton className="h-[280px] rounded-[var(--app-radius)] sm:h-[380px] lg:h-[500px]" />
					</div>

					<Skeleton className="h-[200px] rounded-[var(--app-radius)] sm:h-[280px] lg:h-[360px]" />
				</div>
			</div>
		</div>
	);
}

export function NoWorkspaceState() {
	const { t } = useLocale();
	return (
		<WorkspaceRequiredState
			icon={Building2}
			title={t("Pick a Workspace")}
			description={t("Open a workspace to see your brand dashboard.")}
		/>
	);
}

export function EmptyState({ workspaceId }: { workspaceId: string }) {
	const { t } = useLocale();
	return (
		<EmptyStatePanel
			icon={BarChart3}
			title={t("Your Visibility Dashboard Starts Here")}
			description={t(
				"Run your first prompts to unlock rank, presence, sources, and competitor signals.",
			)}
			examplesLabel={t("What this dashboard unlocks")}
			examples={[
				{ icon: Trophy, label: t("Average rank across providers") },
				{ icon: Link2, label: t("Top source signals") },
				{ icon: Users, label: t("Top competitor signals") },
			]}
			action={
				<Button asChild>
					<Link href={`/prompts?workspace=${workspaceId}`}>
						{t("Open Prompts")}
					</Link>
				</Button>
			}
		/>
	);
}

export function FilteredDashboardState({
	workspaceId,
	modelFilter,
}: {
	workspaceId: string;
	modelFilter: string;
}) {
	const isModelSpecific = modelFilter !== "All Models";
	const { t } = useLocale();

	return (
		<EmptyStatePanel
			eyebrow={t("No matching dashboard data")}
			title={
				isModelSpecific
					? t("No data available for this model")
					: t("No data available for the selected filters")
			}
			description={
				isModelSpecific
					? t(
							"Try another model or run prompts across this model to populate the dashboard.",
						)
					: t("Try another model or time range to populate the dashboard.")
			}
			action={
				<Button asChild>
					<Link href={`/prompts?workspace=${workspaceId}`}>
						{t("Open Prompts")}
					</Link>
				</Button>
			}
		/>
	);
}

export function NoAnalysisState({ workspaceId }: { workspaceId: string }) {
	const { t } = useLocale();
	return (
		<EmptyStatePanel
			eyebrow={t("Analysis required")}
			title={t("No analyzed data available yet")}
			description={t("Run prompts and analysis to populate the dashboard.")}
			action={
				<Button asChild>
					<Link href={`/prompts?workspace=${workspaceId}`}>
						{t("Go to Prompts")}
					</Link>
				</Button>
			}
		/>
	);
}
