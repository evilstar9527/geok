import { getReportById, parsePdfReport } from "@oneglanse/services";
import type { ReportData } from "@oneglanse/types";
import { notFound, redirect } from "next/navigation";
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
	if (parsePdfReport(report.data)) {
		redirect(`/report/${encodeURIComponent(id)}/pdf?view=1`);
	}

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

	return <JiankeReportViewer data={data} />;
}
