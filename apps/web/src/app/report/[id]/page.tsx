import { getReportById } from "@oneglanse/services";
import type { ReportData } from "@oneglanse/types";
import { notFound } from "next/navigation";
import { ReportViewer } from "./report-viewer";

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

	if (!data || data.version !== 1 || !Array.isArray(data.mentionRates)) {
		notFound();
	}

	return <ReportViewer data={data} />;
}
