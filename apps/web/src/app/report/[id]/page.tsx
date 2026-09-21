import { DownloadReportButton } from "@/components/reports/download-report-button";
import { getReportById } from "@oneglanse/services";
import type { ReportData } from "@oneglanse/types";
import { notFound } from "next/navigation";
import { JiankeReportViewer } from "./jianke-report-viewer";

export const dynamic = "force-dynamic";

export default async function ReportPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const report = await getReportById({ id });

	if (!report) notFound();

	let data: ReportData;
	try {
		data = JSON.parse(report.data) as ReportData;
	} catch {
		notFound();
	}

	if (
		!data ||
		(data.version !== 1 && data.version !== 2 && data.version !== 3) ||
		!Array.isArray(data.mentionRates)
	) {
		notFound();
	}

	return (
		<>
			<div className="mx-auto flex max-w-5xl justify-end px-6 pt-6 print:hidden">
				<DownloadReportButton id={id} brandName={report.brandName} />
			</div>
			<JiankeReportViewer data={data} />
		</>
	);
}
