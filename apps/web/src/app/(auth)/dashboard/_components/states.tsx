"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { Button, EmptyStatePanel, WorkspaceRequiredState } from "@oneglanse/ui";
import { BarChart3, Building2, Link2, Trophy, Users } from "lucide-react";
import Link from "next/link";

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
