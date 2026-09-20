import "../../styles/globals.css";
import { appIcons } from "@/lib/app-metadata";
import { auth } from "@/lib/auth/auth";
import { trackUserActive } from "@/lib/telemetry";
import { getWorkspace } from "@/lib/workspace/getWorkspace";
import { TRPCReactProvider } from "@/trpc/react";
import { resolveAppMode } from "@oneglanse/types";
import { SidebarProvider } from "@oneglanse/ui";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import LayoutContent from "./layoutContent";

export const metadata: Metadata = {
	title: "GEO觅蜂引客",
	description:
		"Track how your brand appears in ChatGPT, Gemini, Perplexity, Claude, and AI Overview.",
	icons: appIcons,
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const appMode = resolveAppMode(process.env.ONEGLANSE_APP_MODE);
	const requestHeaders = await headers();
	const isPublicLocalProvidersPage =
		appMode === "local" &&
		requestHeaders.get("x-oneglanse-public-providers") === "1";

	if (isPublicLocalProvidersPage) {
		return children;
	}

	const session = await auth.api.getSession({
		headers: requestHeaders,
	});

	if (!session) {
		return redirect("/login");
	}

	await trackUserActive(session.user.id);

	const cookieStore = await cookies();
	const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

	let workspace = null;
	try {
		workspace = await getWorkspace();
	} catch {
		// The administrator console must remain usable even if automatic brand
		// storage provisioning is temporarily unavailable.
		workspace = null;
	}
	return (
		<>
			<TRPCReactProvider>
				<SidebarProvider defaultOpen={defaultOpen}>
					<LayoutContent
						appMode={appMode}
						workspace={workspace}
						userName={session.user.name}
						userEmail={session.user.email}
						isAdministrator={session.user.role === "admin"}
					>
						{children}
					</LayoutContent>
				</SidebarProvider>
			</TRPCReactProvider>
		</>
	);
}
