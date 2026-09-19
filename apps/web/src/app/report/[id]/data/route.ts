import { getReportById } from "@oneglanse/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dashboardOrigins = new Set([
	"http://8.133.177.51",
	"https://jianke-geo-dashboard.chummy-cedar-3514.chatgpt.site",
	"http://localhost:3001",
]);

// The same public snapshot as /report/[id]; never return workspace or user data.
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const headers = new Headers({
		"Cache-Control": "no-store",
		Vary: "Origin",
	});
	const origin = request.headers.get("Origin");
	if (origin && dashboardOrigins.has(origin)) {
		headers.set("Access-Control-Allow-Origin", origin);
	}
	const { id } = await params;
	if (!/^report_[A-Za-z0-9_-]+$/.test(id)) {
		return Response.json({ error: "报告不存在" }, { status: 404, headers });
	}
	const report = await getReportById({ id });
	if (!report) {
		return Response.json(
			{ error: "报告不存在或已删除" },
			{ status: 404, headers },
		);
	}
	try {
		const data = JSON.parse(report.data);
		if (
			![1, 2, 3].includes(data?.version) ||
			!Array.isArray(data.mentionRates)
		) {
			throw new Error("Unsupported report snapshot");
		}
		return Response.json(
			{ id: report.id, createdAt: report.createdAt, data },
			{ headers },
		);
	} catch {
		return Response.json(
			{ error: "报告数据格式无效" },
			{ status: 422, headers },
		);
	}
}
