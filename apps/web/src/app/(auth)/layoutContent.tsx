// /app/LayoutContent.tsx (Client Component)
"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { formToolbarButtonClassName } from "@/components/forms/auth-form-chrome";
import { LanguageToggle } from "@/components/language-toggle";
import { ProviderRunToastManager } from "@/components/provider-run-toast";
import { signOutAndRedirect } from "@/lib/auth/logout";
import { useLocale } from "@/lib/i18n/locale-context";
import { useSafeSearchParams } from "@/lib/navigation/use-safe-search-params";
import { api } from "@/trpc/react";
import type { Workspace } from "@oneglanse/db";
import { type AppMode, canAccessPeopleInMode } from "@oneglanse/types";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	SidebarTrigger,
	toast,
} from "@oneglanse/ui";
import { cn } from "@oneglanse/utils";
import { ChevronUp, Loader2, User2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { WorkspaceProvider } from "./workspace-context";

function getPageHeader(pathname: string | null): string | null {
	if (!pathname) return null;
	if (pathname.startsWith("/admin")) return "管理员控制台";

	if (pathname.startsWith("/dashboard")) {
		return "Dashboard";
	}

	if (pathname.startsWith("/prompts")) {
		return "Prompts";
	}

	if (pathname.startsWith("/sources")) {
		return "Sources";
	}

	if (pathname.startsWith("/reports")) {
		return "Reports";
	}

	if (pathname.startsWith("/schedule")) {
		return "Schedule";
	}

	if (pathname.startsWith("/people")) {
		return "People";
	}

	if (pathname.startsWith("/providers")) {
		return "Providers";
	}

	if (pathname.startsWith("/settings")) {
		return "Settings";
	}

	if (pathname.startsWith("/workspace")) {
		return "Workspace";
	}

	return null;
}

function UserMenu({
	userName,
	userEmail,
}: {
	userName: string;
	userEmail: string;
}) {
	const router = useRouter();
	const { t } = useLocale();
	const [isLoading, setIsLoading] = useState(false);

	const handleLogout = async () => {
		setIsLoading(true);
		try {
			await signOutAndRedirect("/login");
			toast.success(t("Signed out successfully!"));
		} catch {
			toast.error(t("Failed to sign out!"));
			setIsLoading(false);
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className={cn(
						formToolbarButtonClassName,
						"flex items-center gap-2 px-4",
					)}
				>
					<User2 className="h-4 w-4 shrink-0" />
					<span className="max-w-[140px] truncate">
						{userName || userEmail || "Account"}
					</span>
					<ChevronUp className="ml-auto h-4 w-4 shrink-0" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				side="bottom"
				align="end"
				sideOffset={8}
				className="min-w-0 rounded-[var(--app-radius)] border-transparent bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_18px_-14px_rgba(15,23,42,0.12)] dark:bg-neutral-950 dark:shadow-[0_1px_2px_rgba(0,0,0,0.14),0_10px_24px_-16px_rgba(0,0,0,0.4)]"
				style={{ minWidth: "180px" }}
			>
				<div className="px-2 py-1.5">
					<p className="truncate font-medium text-gray-900 text-xs dark:text-gray-100">
						{userName || "Account"}
					</p>
					<p className="truncate text-gray-500 text-xs dark:text-gray-400">
						{userEmail}
					</p>
				</div>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => void handleLogout()}>
					{isLoading ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<span>{t("Sign out")}</span>
					)}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export default function LayoutContent({
	children,
	appMode,
	workspace,
	userName,
	userEmail,
}: {
	children: React.ReactNode;
	appMode: AppMode;
	workspace: Workspace | null;
	userName: string;
	userEmail: string;
}) {
	const router = useRouter();
	const { t } = useLocale();
	const pathname = usePathname();
	const searchParams = useSafeSearchParams();
	const workspaceIdFromUrl = searchParams.get("workspace") ?? "";

	const shouldFetchWorkspace =
		!!workspaceIdFromUrl && workspace?.id !== workspaceIdFromUrl;
	const workspaceQuery = api.workspace.getById.useQuery(
		{ workspaceId: workspaceIdFromUrl },
		{ enabled: shouldFetchWorkspace },
	);
	const resolvedWorkspace = workspaceQuery.data ?? workspace ?? null;
	const isResolvingWorkspaceFromUrl =
		shouldFetchWorkspace && !workspaceQuery.data && workspaceQuery.isFetching;
	const isPeoplePage = pathname?.startsWith("/people") ?? false;
	const rawPageHeader = getPageHeader(pathname);
	const pageHeader = rawPageHeader ? t(rawPageHeader) : null;
	const workspaceHref = "/admin";
	const runToastManager = <ProviderRunToastManager />;

	useEffect(() => {
		if (!canAccessPeopleInMode(appMode) && isPeoplePage) {
			router.replace(workspaceHref);
		}
	}, [appMode, isPeoplePage, router, workspaceHref]);


	if (!resolvedWorkspace) {
		if (isResolvingWorkspaceFromUrl) {
			return (
				<>
					{runToastManager}
					<div className="web-app-shell">
						<main className="web-app-main bg-stone-50 dark:bg-neutral-950" />
					</div>
				</>
			);
		}

		return (
			<>
				{runToastManager}
				<div className="web-app-shell">
					<main className="web-app-main bg-stone-50 dark:bg-neutral-950">
						<div className="fixed top-4 right-4 z-50 flex items-center gap-2">
							<LanguageToggle />
							<UserMenu userName={userName} userEmail={userEmail} />
						</div>
						<div className="web-app-scroll">{children}</div>
					</main>
				</div>
			</>
		);
	}

	return (
		<>
			{runToastManager}
			<WorkspaceProvider workspace={resolvedWorkspace} userEmail={userEmail}>
				<div className="web-app-shell">
					<AppSidebar
						appMode={appMode}
						workspace={resolvedWorkspace}
						userName={userName}
						userEmail={userEmail}
					/>
					<main className="web-app-main">
						{pageHeader ? (
							<header className="web-app-header">
								<SidebarTrigger className="size-8 shrink-0 rounded-none border-transparent bg-transparent p-0 shadow-none hover:bg-transparent dark:hover:bg-transparent" />
								<h1 className="truncate font-medium text-[0.95rem] text-gray-950 tracking-[-0.01em] dark:text-gray-50">
									{pageHeader}
								</h1>
								<LanguageToggle className="ml-auto" />
							</header>
						) : null}
						<div className="web-app-scroll">{children}</div>
					</main>
				</div>
			</WorkspaceProvider>
		</>
	);
}
