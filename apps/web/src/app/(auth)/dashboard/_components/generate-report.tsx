"use client";

import { formToolbarButtonClassName } from "@/components/forms/auth-form-chrome";
import { useLocale } from "@/lib/i18n/locale-context";
import { api } from "@/trpc/react";
import type { ReportData } from "@oneglanse/types";
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@oneglanse/ui";
import { Check, Copy, ExternalLink, FileBarChart2, Loader2 } from "lucide-react";
import { useState } from "react";

export function GenerateReportButton({
	workspaceId,
	reportData,
	disabled = false,
}: {
	workspaceId: string;
	reportData: ReportData;
	disabled?: boolean;
}) {
	const { locale } = useLocale();
	const isZh = locale === "zh-CN";
	const createReport = api.report.create.useMutation();
	const utils = api.useUtils();
	const [url, setUrl] = useState<string | null>(null);
	const [open, setOpen] = useState(false);
	const [copied, setCopied] = useState(false);

	async function handleGenerate() {
		const result = await createReport.mutateAsync({
			workspaceId,
			brandName: reportData.brand.name,
			brandDomain: reportData.brand.domain,
			data: reportData,
		});
		await utils.report.list.invalidate();
		setUrl(`${window.location.origin}/report/${result.id}`);
		setCopied(false);
		setOpen(true);
	}

	async function handleCopy() {
		if (!url) return;
		await navigator.clipboard.writeText(url);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<>
			<Button
				variant="outline"
				className={`${formToolbarButtonClassName} gap-2`}
				disabled={disabled || createReport.isPending}
				onClick={handleGenerate}
			>
				<FileBarChart2 className="h-4 w-4" />
				{isZh ? "生成报告" : "Generate Report"}
			</Button>

			<Dialog open={createReport.isPending} onOpenChange={() => {}}>
				<DialogContent showCloseButton={false}>
					<div className="flex flex-col items-center gap-4 py-6 text-center">
						<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
						<DialogHeader>
							<DialogTitle>{isZh ? "正在生成报告" : "Generating report"}</DialogTitle>
							<DialogDescription>
								{isZh
									? "正在分析数据并生成优化建议，通常需要十几秒，请稍候…"
									: "Analyzing data and generating recommendations — this can take a few seconds."}
							</DialogDescription>
						</DialogHeader>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{isZh ? "报告已生成" : "Report ready"}</DialogTitle>
						<DialogDescription>
							{isZh
								? "复制下方链接即可分享给任何人查看，无需登录。"
								: "Copy the link below to share it with anyone — no login needed."}
						</DialogDescription>
					</DialogHeader>

					<div className="flex min-w-0 items-center gap-2 rounded-[var(--app-radius)] border border-gray-200/80 bg-stone-50 p-2 dark:border-gray-800 dark:bg-neutral-900">
						<span className="min-w-0 flex-1 truncate text-xs text-gray-600 dark:text-gray-300">
							{url}
						</span>
						<Button variant="secondary" size="sm" onClick={handleCopy}>
							{copied ? (
								<Check className="h-3.5 w-3.5 text-emerald-600" />
							) : (
								<Copy className="h-3.5 w-3.5" />
							)}
							{copied ? (isZh ? "已复制" : "Copied") : isZh ? "复制" : "Copy"}
						</Button>
					</div>

					<DialogFooter>
						<a href={url ?? undefined} target="_blank" rel="noreferrer">
							<Button disabled={!url}>
								<ExternalLink className="h-4 w-4" />
								{isZh ? "打开报告" : "Open report"}
							</Button>
						</a>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
