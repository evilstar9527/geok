export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dashboardOrigins = new Set([
	"http://8.133.177.51",
	"https://jianke-geo-dashboard.chummy-cedar-3514.chatgpt.site",
	"http://localhost:3001",
]);

export async function GET(request: Request) {
	const headers = new Headers({ "Cache-Control": "no-store", Vary: "Origin" });
	const origin = request.headers.get("Origin");
	if (origin && dashboardOrigins.has(origin)) {
		headers.set("Access-Control-Allow-Origin", origin);
	}
	if (new URL(request.url).search) {
		return Response.json(
			{ error: "此看板不接受查询参数" },
			{ status: 400, headers },
		);
	}
	const workspaceId = process.env.PUBLIC_DASHBOARD_WORKSPACE_ID?.trim();
	if (!workspaceId) {
		return Response.json(
			{ error: "公开看板尚未配置" },
			{ status: 503, headers },
		);
	}
	try {
		const { fetchPublicDashboard } = await import("@oneglanse/services");
		const dashboard = await fetchPublicDashboard(workspaceId);
		if (!dashboard) {
			return Response.json(
				{ error: "公开看板不可用" },
				{ status: 404, headers },
			);
		}
		return Response.json(dashboard, { headers });
	} catch {
		return Response.json(
			{ error: "暂时无法读取看板数据" },
			{ status: 503, headers },
		);
	}
}
