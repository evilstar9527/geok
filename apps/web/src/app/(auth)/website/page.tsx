"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@oneglanse/ui";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";

export default function WebsitePage() {
	const { locale } = useLocale();
	const isZh = locale === "zh-CN";
	const [activePage, setActivePage] = useState("home");
	const pages = [
		{ id: "home", path: "", label: isZh ? "官网首页" : "Home" },
		{
			id: "services",
			path: "/services-lite",
			label: isZh ? "服务方案" : "Services",
		},
		{
			id: "cases",
			path: "/case-studies",
			label: isZh ? "客户案例" : "Case studies",
		},
		{ id: "blog", path: "/blog", label: isZh ? "GEO 观察" : "Blog" },
	] as const;
	const selected = pages.find((page) => page.id === activePage) ?? pages[0];
	const websiteUrl = `/official-site${selected.path}`;

	return (
		<div className="web-page-wide">
			<div className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-6 sm:px-7 lg:px-10">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h2 className="font-semibold text-2xl text-gray-950 dark:text-gray-50">
							{isZh ? "见客官网" : "JianKe website"}
						</h2>
						<p className="mt-2 text-gray-500 text-sm">
							{isZh
								? "了解见客的服务、客户案例与 GEO 行业观察。"
								: "Explore JianKe services, customer stories and GEO insights."}
						</p>
					</div>
					<a
						href={websiteUrl}
						target="_blank"
						rel="noreferrer"
						className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-neutral-900"
					>
						{isZh ? "独立打开" : "Open website"}
						<ArrowUpRight className="size-4" />
					</a>
				</div>
				<Tabs
					value={activePage}
					onValueChange={setActivePage}
					className="gap-4"
				>
					<div className="max-w-full overflow-x-auto pb-1">
						<TabsList
							aria-label={isZh ? "官网页面" : "Website pages"}
							className="h-auto w-max gap-1 rounded-full border border-gray-200/70 bg-stone-100/80 p-1.5 dark:border-gray-800 dark:bg-neutral-900"
						>
							{pages.map((page) => (
								<TabsTrigger
									key={page.id}
									value={page.id}
									className="h-10 flex-none rounded-full px-5 data-[state=active]:bg-gray-950 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-950"
								>
									{page.label}
								</TabsTrigger>
							))}
						</TabsList>
					</div>
					<TabsContent
						value={activePage}
						className="overflow-hidden rounded-2xl border border-gray-200 bg-[#07161f] dark:border-gray-800"
					>
						<iframe
							key={activePage}
							src={websiteUrl}
							title={selected.label}
							className="block h-[calc(100dvh-270px)] min-h-[600px] w-full border-0"
						/>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
