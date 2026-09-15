"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

export function DownloadReportButton({
	id,
	brandName,
}: { id: string; brandName: string }) {
	const { locale } = useLocale();
	const isZh = locale === "zh-CN";
	const [downloading, setDownloading] = useState(false);
	const [error, setError] = useState("");
	async function download() {
		setDownloading(true);
		setError("");
		try {
			const path = `/report/${encodeURIComponent(id)}/pdf`;
			const response = await fetch(path, { method: "HEAD" });
			if (!response.ok)
				throw new Error(
					response.status === 503
						? "其他报告正在生成，请稍后重试。"
						: "PDF 下载失败，请重试。",
				);
			if (!response.headers.get("content-type")?.startsWith("application/pdf"))
				throw new Error("PDF 下载失败，请重试。");
			const anchor = document.createElement("a");
			anchor.href = path;
			anchor.download = `${brandName.replace(/[/\\]/g, "-")}-AI可见度报告.pdf`;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "PDF 下载失败，请重试。",
			);
		} finally {
			setDownloading(false);
		}
	}
	return (
		<div className="print:hidden">
			<button
				type="button"
				onClick={download}
				disabled={downloading}
				className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-gray-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-60"
			>
				{downloading ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<Download className="h-4 w-4" />
				)}
				{downloading
					? isZh
						? "正在生成 PDF…"
						: "Generating PDF…"
					: isZh
						? "下载 PDF"
						: "Download PDF"}
			</button>
			{error ? (
				<p role="alert" className="mt-2 text-xs text-red-600">
					{error}
				</p>
			) : null}
		</div>
	);
}
