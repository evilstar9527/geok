import { canAccessPeopleInMode, resolveAppMode } from "@oneglanse/types";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
	const appMode = resolveAppMode(process.env.ONEGLANSE_APP_MODE);
	const { pathname, searchParams } = request.nextUrl;

	// In local mode, /providers is the auth setup page and /api/providers powers
	// the connect buttons on that page. Both must work without an app session.
	const isLocalProvidersPage =
		appMode === "local" && pathname.startsWith("/providers");
	const isLocalProvidersApi =
		appMode === "local" && pathname.startsWith("/api/providers");
	const isPublicLocalProvidersRequest =
		isLocalProvidersPage || isLocalProvidersApi;

	const session = isPublicLocalProvidersRequest
		? null
		: await (await import("@/lib/auth/auth")).auth.api.getSession({
				headers: request.headers,
			});

	if (!session && !isPublicLocalProvidersRequest) {
		const loginUrl = new URL("/login", request.url);
		const requestPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
		loginUrl.searchParams.set("next", requestPath);
		return NextResponse.redirect(loginUrl);
	}
	const isAdministrator =
		(session?.user as { role?: string } | undefined)?.role === "admin";
	if (session && !isAdministrator && !pathname.startsWith("/api/")) {
		const readOnlyRoutes = ["/dashboard", "/prompts", "/sources", "/reports"];
		const isReadOnlyRoute = readOnlyRoutes.some(
			(route) => pathname === route || pathname.startsWith(`${route}/`),
		);
		if (pathname !== "/" && !isReadOnlyRoute) {
			const workspaceId = searchParams.get("workspace");
			const target = new URL(workspaceId ? "/dashboard" : "/", request.url);
			if (workspaceId) target.searchParams.set("workspace", workspaceId);
			return NextResponse.redirect(target);
		}
	}
	if (pathname.startsWith("/workspace") || pathname.startsWith("/onboarding")) {
		return NextResponse.redirect(new URL("/admin", request.url));
	}
	const workspaceId = searchParams.get("workspace");

	const workspaceUrl = new URL("/admin", request.url);
	if (workspaceId) {
		workspaceUrl.searchParams.set("workspace", workspaceId);
	}

	if (pathname.startsWith("/people") && !canAccessPeopleInMode(appMode)) {
		return NextResponse.redirect(workspaceUrl);
	}

	if (isLocalProvidersPage) {
		const requestHeaders = new Headers(request.headers);
		requestHeaders.set("x-oneglanse-public-providers", "1");
		return NextResponse.next({
			request: {
				headers: requestHeaders,
			},
		});
	}

	return NextResponse.next();
}

export const config = {
	// api/health is excluded so an unauthenticated probe reaches the route. Without
	// it the middleware redirects to /login, and because fetch follows redirects the
	// probe would settle on a 200 login page and report healthy with every backing
	// service down.
	matcher: [
		"/((?!login|signup|report|api/auth|api/health|_next|static|favicon.ico).*)",
	],
};
