import {
	parseProviderAccountId,
	withProviderAccount,
} from "@oneglanse/services";
import { PROVIDER_ACCOUNT_IDS } from "@oneglanse/types";
import { auth } from "@/lib/auth/auth";
import { readProviderConnectionsState } from "@/lib/provider-connections/server";
import {
	resetProviderAuthData,
	spawnProviderAuthLogin,
} from "@oneglanse/services";
import { AUTH_PROVIDER_LIST, resolveAppMode } from "@oneglanse/types";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const connectProviderSchema = z.object({
	provider: z.enum(AUTH_PROVIDER_LIST),
	accountId: z.enum(PROVIDER_ACCOUNT_IDS).default("default"),
	action: z.enum(["connect", "refresh"]).default("connect"),
});

function isLocalProvidersMode(): boolean {
	return resolveAppMode(process.env.ONEGLANSE_APP_MODE) === "local";
}

/**
 * True only for requests that did not arrive from somewhere else.
 *
 * Local mode deliberately serves this API without a session, because `pnpm auth`
 * drives it from a browser on the operator's own machine (`scripts/run-auth.mjs`
 * opens localhost:3100 and never logs in). But `.env.example` ships
 * `ONEGLANSE_APP_MODE=local`, so a deploy that copies it runs in that mode too —
 * and there the same exemption would let anyone who can reach the app read
 * provider state, spawn interactive logins, or wipe every provider session.
 *
 * The exemption therefore requires the request to look local on both signals: a
 * reverse proxy always adds X-Forwarded-For and rewrites Host, while a browser
 * talking to localhost:3000 does neither. Requiring both means a proxy that
 * forwards only one of them still fails closed. This relies on the web port
 * being published to 127.0.0.1 (see docker-compose.yml), which is what stops a
 * direct remote connection from arriving here stripped of both headers.
 */
function isLocallyOriginated(request: Request): boolean {
	const clientAddress = request.headers
		.get("x-forwarded-for")
		?.split(",")
		.at(-1)
		?.trim();
	if (
		clientAddress &&
		clientAddress !== "127.0.0.1" &&
		clientAddress !== "::1"
	) {
		return false;
	}

	const host = request.headers.get("host");
	if (!host) return false;

	try {
		const hostname = new URL(`http://${host}`).hostname;
		return (
			hostname === "localhost" ||
			hostname === "127.0.0.1" ||
			// URL keeps the brackets on an IPv6 literal.
			hostname === "::1" ||
			hostname === "[::1]"
		);
	} catch {
		return false;
	}
}

async function requireProvidersApiAccess(request: Request) {
	if (isLocalProvidersMode() && isLocallyOriginated(request)) {
		return null;
	}

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (session) {
		return null;
	}

	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
	const unauthorizedResponse = await requireProvidersApiAccess(request);
	if (unauthorizedResponse) {
		return unauthorizedResponse;
	}

	try {
		const accountId = parseProviderAccountId(
			new URL(request.url).searchParams.get("accountId") ?? "default",
		);
		return NextResponse.json(
			await withProviderAccount(accountId, readProviderConnectionsState),
		);
	} catch {
		return NextResponse.json(
			{ error: "Invalid provider account" },
			{ status: 400 },
		);
	}
}

export async function POST(request: Request) {
	const unauthorizedResponse = await requireProvidersApiAccess(request);
	if (unauthorizedResponse) {
		return unauthorizedResponse;
	}

	if (!isLocalProvidersMode()) {
		return NextResponse.json(
			{
				error:
					"Interactive provider connect and refresh are only available in local mode.",
			},
			{ status: 405 },
		);
	}

	try {
		const payload = connectProviderSchema.parse(await request.json());
		void payload.action;
		return NextResponse.json(
			await withProviderAccount(payload.accountId, () =>
				spawnProviderAuthLogin(payload.provider),
			),
		);
	} catch (error) {
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Invalid request",
			},
			{ status: 400 },
		);
	}
}

export async function DELETE(request: Request) {
	const unauthorizedResponse = await requireProvidersApiAccess(request);
	if (unauthorizedResponse) {
		return unauthorizedResponse;
	}

	if (!isLocalProvidersMode()) {
		return NextResponse.json(
			{
				error: "Provider reset is only available in local mode.",
			},
			{ status: 405 },
		);
	}

	try {
		const accountId = parseProviderAccountId(
			new URL(request.url).searchParams.get("accountId") ?? "default",
		);
		await withProviderAccount(accountId, () =>
			Promise.all(
				AUTH_PROVIDER_LIST.map((authProvider) =>
					resetProviderAuthData(authProvider),
				),
			),
		);
		return NextResponse.json({ ok: true });
	} catch (error) {
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : "Failed to reset providers",
			},
			{ status: 500 },
		);
	}
}
