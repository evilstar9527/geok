"use client";

import { DownloadReportButton } from "@/components/reports/download-report-button";
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
	toast,
} from "@oneglanse/ui";
import {
	Check,
	Copy,
	ExternalLink,
	FileBarChart2,
	Loader2,
} from "lucide-react";
import { useState } from "react";

/**
 * `navigator.clipboard` is secure-context only, so on a plain-HTTP deployment
 * (`http://<host>:3000`) it is `undefined` and this used to reject before
 * `setCopied` ran — the copy button did nothing and said nothing. Fall back to
 * the legacy `execCommand` path, which has no such restriction.
 */
async function copyToClipboard(text: string): Promise<boolean> {
	if (navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {
			// Denied permission, or not a secure context after all — fall through.
		}
	}

	try {
		const scratch = document.createElement("textarea");
		scratch.value = text;
		scratch.setAttribute("readonly", "");
		scratch.style.position = "fixed";
		scratch.style.opacity = "0";
		document.body.appendChild(scratch);
		scratch.select();
		const copied = document.execCommand("copy");
		scratch.remove();
		return copied;
	} catch {
		return false;
	}
}

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
	const [reportId, setReportId] = useState<string | null>(null);
	const [url, setUrl] = useState<string | null>(null);
	const [open, setOpen] = useState(false);
	const [copied, setCopied] = useState(false);

	async function handleGenerate() {
		try {
			const result = await createReport.mutateAsync({
				workspaceId,
				brandName: reportData.brand.name,
				brandDomain: reportData.brand.domain,
				data: reportData,
			});
			await utils.report.list.invalidate();
			setReportId(result.id);
			setUrl(`${window.location.origin}/report/${result.id}`);
			setCopied(false);
			setOpen(true);
		} catch {
			toast.error(
				isZh
					? "报告生成失败，请稍后重试。"
					: "Report generation failed. Please try again.",
			);
		}
	}

	async function handleCopy() {
		if (!url) return;
		const copied = await copyToClipboard(url);
		if (!copied) {
			toast.error(isZh ? "复制失败，请手动复制链接。" : "Copy failed.");
			return;
		}
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
							<DialogTitle>
								{isZh ? "正在生成报告" : "Generating report"}
							</DialogTitle>
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
						{reportId ? (
							<DownloadReportButton
								id={reportId}
								brandName={reportData.brand.name}
							/>
						) : null}
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
