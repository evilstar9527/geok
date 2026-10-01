import { PdfRendererBusyError, getReportPdf } from "@/lib/reports/pdf";
import { getReportById, parsePdfReport } from "@oneglanse/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	if (!/^report_[A-Za-z0-9_-]+$/.test(id))
		return new Response("Report not found", { status: 404 });
	const report = await getReportById({ id });
	if (!report) return new Response("Report not found", { status: 404 });
	try {
		const imported = parsePdfReport(report.data);
		const pdf = imported
			? Buffer.from(imported.contentBase64, "base64")
			: await getReportPdf(id);
		const name =
			imported?.filename ??
			`${report.brandName.replace(/[\r\n/\\]/g, "-")}-AI可见度报告.pdf`;
		const disposition =
			imported && new URL(request.url).searchParams.get("view") === "1"
				? "inline"
				: "attachment";
		return new Response(new Uint8Array(pdf), {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `${disposition}; filename="ai-visibility-report.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
				"Cache-Control": "private, no-store",
			},
		});
	} catch (error) {
		if (error instanceof PdfRendererBusyError)
			return new Response("正在生成其他报告，请稍后重试。", {
				status: 503,
				headers: { "Retry-After": "10" },
			});
		console.error("Report PDF generation failed", { reportId: id, error });
		return new Response("PDF 暂时生成失败，请稍后重试。", { status: 500 });
	}
}
