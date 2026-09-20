"use client";

import { formToolbarButtonClassName } from "@/components/forms/auth-form-chrome";
import { signOutAndRedirect } from "@/lib/auth/logout";
import { useLocale } from "@/lib/i18n/locale-context";
import { api } from "@/trpc/react";
import type { Workspace } from "@oneglanse/db";
import type { AppMode } from "@oneglanse/types";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	toast,
} from "@oneglanse/ui";
import { cn } from "@oneglanse/utils";
import {
	Check,
	ChevronUp,
	ChevronsUpDown,
	Clock,
	FileBarChart2,
	Globe,
	LayoutGrid,
	Loader2,
	MessageSquare,
	Plug,
	Settings,
	ShieldCheck,
	Store,
	User2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface AppSidebarProps {
	appMode: AppMode;
	workspace: Workspace | null;
	userName: string;
	userEmail: string;
	isAdministrator: boolean;
}

export function AppSidebar({
	appMode,
	workspace,
	userName,
	userEmail,
	isAdministrator,
}: AppSidebarProps) {
	const { t } = useLocale();
	const [isLoading, setIsLoading] = useState(false);
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const activeWorkspace = workspace;
	const accountsQuery = api.admin.listAccounts.useQuery(undefined, {
		enabled: isAdministrator,
	});
	const brands = isAdministrator
		? (accountsQuery.data ?? []).flatMap((account) =>
				account.brands.map((brand) => ({
					...brand,
					account: account.account,
				})),
			)
		: activeWorkspace
			? [
					{
						id: activeWorkspace.id,
						name: activeWorkspace.name,
						account: userName,
					},
				]
			: [];
	const currentBrand = brands.find((brand) => brand.id === activeWorkspace?.id);

	const handleBrandChange = (workspaceId: string) => {
		const params = new URLSearchParams(searchParams?.toString() ?? "");
		params.set("workspace", workspaceId);
		router.push(`${pathname}?${params.toString()}`);
	};

	const generalItems = [
		...(isAdministrator
			? [
					{
						title: "管理控制台",
						url: "/admin",
						icon: ShieldCheck,
					},
				]
			: []),
		{
			title: t("Dashboard"),
			url: `/dashboard?workspace=${activeWorkspace?.id ?? ""}`,
			icon: LayoutGrid,
		},
		{
			title: t("Prompts"),
			url: `/prompts?workspace=${activeWorkspace?.id ?? ""}`,
			icon: MessageSquare,
		},
		{
			title: t("Sources"),
			url: `/sources?workspace=${activeWorkspace?.id ?? ""}`,
			icon: Globe,
		},
		{
			title: t("Reports"),
			url: `/reports?workspace=${activeWorkspace?.id ?? ""}`,
			icon: FileBarChart2,
		},
	];

	if (isAdministrator) {
		generalItems.splice(4, 0, {
			title: t("Schedule"),
			url: `/schedule?workspace=${activeWorkspace?.id ?? ""}`,
			icon: Clock,
		});
	}

	const settingsItems = isAdministrator
		? [
				{
					title: t("Providers"),
					url: `/providers?workspace=${activeWorkspace?.id ?? ""}`,
					icon: Plug,
				},
				{
					title: t("Settings"),
					url: `/settings?workspace=${activeWorkspace?.id ?? ""}`,
					icon: Settings,
				},
			]
		: [];

	const handleLogout = async () => {
		setIsLoading(true);
		try {
			await signOutAndRedirect("/login");
			toast.success(t("Signed out successfully!"));
		} catch (err) {
			console.error(err);
			toast.error(t("Failed to sign out!"));
			setIsLoading(false);
		}
	};

	return (
		<>
			<Sidebar className="flex h-full min-h-full flex-col self-stretch bg-white dark:bg-neutral-950">
				<SidebarHeader className="p-3">
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton className="h-11 px-4" asChild>
								<Link
									href={
										isAdministrator
											? "/admin"
											: `/dashboard?workspace=${activeWorkspace?.id ?? ""}`
									}
								>
									<ShieldCheck className="h-4 w-4 shrink-0 text-indigo-600" />
									<span className="truncate font-semibold text-sm">
										GEO觅蜂引客
									</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<SidebarMenuButton className="h-auto min-h-12 items-center px-4 py-2.5">
										<Store className="h-4 w-4 shrink-0 text-gray-500" />
										<span className="min-w-0 flex-1 text-left">
											<span className="block text-[10px] text-muted-foreground">
												当前品牌
											</span>
											<span className="block truncate font-medium text-[13px]">
												{currentBrand?.name ??
													activeWorkspace?.name ??
													"暂无品牌"}
											</span>
										</span>
										<ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
									</SidebarMenuButton>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									side="bottom"
									align="start"
									sideOffset={6}
									className="min-w-56 rounded-[var(--app-radius)] p-1.5"
								>
									<div className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
										切换品牌
									</div>
									{accountsQuery.isLoading ? (
										<div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
											<Loader2 className="size-3.5 animate-spin" />
											正在加载品牌
										</div>
									) : brands.length ? (
										brands.map((brand) => (
											<DropdownMenuItem
												key={brand.id}
												onSelect={() => handleBrandChange(brand.id)}
												className="flex cursor-pointer items-center gap-2 py-2"
											>
												<span className="min-w-0 flex-1">
													<span className="block truncate text-sm">
														{brand.name}
													</span>
													<span className="block truncate text-[11px] text-muted-foreground">
														账号：{brand.account}
													</span>
												</span>
												{brand.id === activeWorkspace?.id ? (
													<Check className="size-4 shrink-0 text-indigo-600" />
												) : null}
											</DropdownMenuItem>
										))
									) : (
										<div className="px-2 py-2 text-xs text-muted-foreground">
											暂无可切换品牌
										</div>
									)}
									{currentBrand ? (
										<>
											<DropdownMenuSeparator />
											<div className="px-2 py-1 text-[10px] text-muted-foreground">
												当前账号：{currentBrand.account}
											</div>
										</>
									) : null}
								</DropdownMenuContent>
							</DropdownMenu>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<SidebarMenuButton
								asChild
								isActive={pathname === "/website"}
								className="h-11 px-4 font-medium text-[13px]"
							>
								<Link href={`/website?workspace=${activeWorkspace?.id ?? ""}`}>
									<Globe />
									<span>{t("Website")}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>

				<SidebarContent className="flex-1 overflow-y-auto">
					<SidebarGroup>
						<SidebarGroupLabel className="px-3 font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.08em]">
							{t("General")}
						</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{generalItems.map((item) => (
									<SidebarMenuItem key={item.title}>
										<SidebarMenuButton
											asChild
											isActive={pathname === item.url.split("?")[0]}
											className="h-11 rounded-[var(--app-radius)] px-4 font-medium text-[13px]"
										>
											<Link href={item.url}>
												<item.icon />
												<span>{item.title}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
					{settingsItems.length > 0 ? (
						<SidebarGroup>
							<SidebarGroupLabel className="px-3 font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.08em]">
								{t("Settings")}
							</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									{settingsItems.map((item) => (
										<SidebarMenuItem key={item.title}>
											<SidebarMenuButton
												asChild
												isActive={pathname === item.url.split("?")[0]}
												className="h-11 rounded-[var(--app-radius)] px-4 font-medium text-[13px]"
											>
												<Link href={item.url}>
													<item.icon />
													<span>{item.title}</span>
												</Link>
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					) : null}
				</SidebarContent>

				<SidebarFooter className="flex-shrink-0 p-3 pt-1">
					<SidebarMenu>
						<SidebarMenuItem>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<SidebarMenuButton
										className={cn(
											formToolbarButtonClassName,
											"h-11 px-4 hover:bg-stone-100 dark:hover:bg-neutral-900",
										)}
									>
										<User2 />
										<span className="truncate">
											{userName || userEmail || "Account"}
										</span>
										<ChevronUp className="ml-auto" />
									</SidebarMenuButton>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									side="top"
									sideOffset={8}
									className="min-w-0 rounded-[var(--app-radius)] border-transparent bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_18px_-14px_rgba(15,23,42,0.12)] dark:bg-neutral-950 dark:shadow-[0_1px_2px_rgba(0,0,0,0.14),0_10px_24px_-16px_rgba(0,0,0,0.4)]"
									style={{
										width: "var(--radix-dropdown-menu-trigger-width)",
										maxWidth: "var(--radix-dropdown-menu-trigger-width)",
									}}
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
									<DropdownMenuItem onClick={handleLogout}>
										{isLoading ? (
											<Loader2 className="size-4 animate-spin" />
										) : (
											<span>{t("Sign out")}</span>
										)}
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
			</Sidebar>
		</>
	);
}
