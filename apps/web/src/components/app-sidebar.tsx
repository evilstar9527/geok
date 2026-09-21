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
	ChartNoAxesCombined,
	Check,
	ChevronUp,
	ChevronsUpDown,
	Clock,
	Compass,
	Gauge,
	Globe,
	List,
	Loader2,
	MessageCircle,
	MessageSquare,
	Plug,
	Settings,
	ShieldCheck,
	Store,
	User2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const APP_NAME = "秘蜂赢客";

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

	const dashboardUrl = `/dashboard?workspace=${activeWorkspace?.id ?? ""}`;
	const workspaceQuery = `?workspace=${activeWorkspace?.id ?? ""}`;

	type NavItem = {
		title: string;
		url: string;
		icon: LucideIcon;
		tab?: string;
	};

	/** 秘蜂监测 — the analysis views, all driven by the same filter bar. */
	const monitorItems: NavItem[] = [
		{
			title: t("Overview"),
			url: dashboardUrl,
			icon: Gauge,
			tab: "overview",
		},
		{
			title: t("Mention analysis"),
			url: `${dashboardUrl}&tab=mentions`,
			icon: MessageCircle,
			tab: "mentions",
		},
		{
			title: t("Competitors"),
			url: `${dashboardUrl}&tab=competitors`,
			icon: ChartNoAxesCombined,
			tab: "competitors",
		},
		{
			title: t("Citation sources"),
			url: `/sources${workspaceQuery}`,
			icon: Compass,
		},
	];

	/** 报告中心 */
	const reportItems: NavItem[] = [
		{
			title: t("My reports"),
			url: `/reports${workspaceQuery}`,
			icon: List,
		},
	];

	/** Everything the monitoring IA has no slot for stays reachable here. */
	const configItems: NavItem[] = [
		{
			title: t("Prompts"),
			url: `/prompts${workspaceQuery}`,
			icon: MessageSquare,
		},
		{ title: t("Website"), url: `/website${workspaceQuery}`, icon: Globe },
		...(isAdministrator
			? [
					{
						title: t("Schedule"),
						url: `/schedule${workspaceQuery}`,
						icon: Clock,
					},
					{
						title: t("Providers"),
						url: `/providers${workspaceQuery}`,
						icon: Plug,
					},
					{
						title: t("Settings"),
						url: `/settings${workspaceQuery}`,
						icon: Settings,
					},
					{ title: "管理控制台", url: "/admin", icon: ShieldCheck },
				]
			: []),
	];

	// The dashboard sections share one route, so the URL only tells them
	// apart through `tab`.
	const activeDashboardTab = searchParams?.get("tab") ?? "overview";
	const isItemActive = (item: { url: string; tab?: string }) => {
		const base = item.url.split("?")[0];
		if (pathname !== base) return false;
		if (base !== "/dashboard") return true;
		return (item.tab ?? "overview") === activeDashboardTab;
	};

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
				<SidebarHeader className="gap-1 border-[var(--geo-card-border)] border-b p-2">
					<SidebarMenu>
						{/* Product identity, above the brand being monitored. */}
						<SidebarMenuItem>
							<SidebarMenuButton
								className="h-11 items-center gap-2 px-2 hover:bg-transparent active:bg-transparent"
								asChild
							>
								<Link
									href={
										isAdministrator
											? "/admin"
											: `/dashboard?workspace=${activeWorkspace?.id ?? ""}`
									}
								>
									<img
										src="/logo.png?v=bee-yellow-20260921"
										alt=""
										width={24}
										height={24}
										className="h-6 w-6 shrink-0 rounded-md object-contain"
									/>
									<span className="truncate font-semibold text-[15px] text-[var(--geo-accent)] tracking-tight">
										{APP_NAME}
									</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<SidebarMenuButton className="h-auto items-center gap-2 rounded-[6px] border border-[var(--geo-field-border)] px-2 py-1.5">
										<Store className="size-4 shrink-0 text-[var(--geo-th-fg)]" />
										<span className="min-w-0 flex-1 text-left">
											<span className="block text-[10px] text-muted-foreground leading-tight">
												当前品牌
											</span>
											<span className="block truncate font-medium text-[13px] leading-tight">
												{currentBrand?.name ??
													activeWorkspace?.name ??
													"暂无品牌"}
											</span>
										</span>
										<ChevronsUpDown className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
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
													<Check className="size-4 shrink-0 text-[var(--geo-accent)]" />
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
					</SidebarMenu>
				</SidebarHeader>

				<SidebarContent className="flex-1 overflow-y-auto py-1">
					{[
						{ label: t("Monitoring"), items: monitorItems },
						{ label: t("Report center"), items: reportItems },
						{ label: t("Configuration"), items: configItems },
					]
						.filter((group) => group.items.length > 0)
						.map((group) => (
							<SidebarGroup key={group.label} className="gap-0 py-1">
								<SidebarGroupLabel className="h-8 px-3 font-normal text-[12px] text-muted-foreground">
									{group.label}
								</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu className="gap-0.5">
										{group.items.map((item) => (
											<SidebarMenuItem key={item.title}>
												<SidebarMenuButton
													asChild
													isActive={isItemActive(item)}
													className="geo-nav-item h-[38px] rounded-[6px] px-3 text-[13px]"
												>
													<Link href={item.url}>
														<item.icon className="size-4" />
														<span>{item.title}</span>
													</Link>
												</SidebarMenuButton>
											</SidebarMenuItem>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						))}
				</SidebarContent>

				<SidebarFooter className="flex-shrink-0 p-3 pt-1">
					<SidebarMenu>
						<SidebarMenuItem>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<SidebarMenuButton
										className={cn(
											formToolbarButtonClassName,
											"h-11 px-4 hover:bg-[var(--geo-accent-soft)] dark:hover:bg-neutral-900",
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
