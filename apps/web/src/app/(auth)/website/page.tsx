"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@oneglanse/ui";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

function WebsitePreview({
	src,
	title,
	isZh,
}: { src: string; title: string; isZh: boolean }) {
	const [status, setStatus] = useState<"loading" | "ready" | "slow">("loading");
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		if (status !== "loading") return;
		const timer = window.setTimeout(() => setStatus("slow"), 12000);
		return () => window.clearTimeout(timer);
	}, [status]);

	return (
		<div className="relative bg-white">
			{status !== "ready" && (
				<output className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-center gap-3 bg-white/95 px-4 py-3 text-gray-600 text-sm">
					{status === "loading" ? (
						<>
							<Loader2 className="size-4 animate-spin" aria-hidden="true" />
							{isZh ? "正在加载官网…" : "Loading website…"}
						</>
					) : (
						<>
							{isZh
								? "官网暂未加载完成，可以重试或独立打开。"
								: "The website has not finished loading. Retry or open it separately."}
							<button
								type="button"
								className="font-medium text-gray-950 underline"
								onClick={() => {
									setStatus("loading");
									setAttempt((value) => value + 1);
								}}
							>
								{isZh ? "重新加载" : "Retry"}
							</button>
						</>
					)}
				</output>
			)}
			<iframe
				key={attempt}
				src={src}
				title={title}
				onLoad={(event) => {
					try {
						const document = event.currentTarget.contentDocument;
						setStatus(
							document?.body.dataset.page && document.querySelector("main h1")
								? "ready"
								: "slow",
						);
					} catch {
						setStatus("slow");
					}
				}}
				className="block h-[calc(100dvh-270px)] min-h-[600px] w-full border-0"
			/>
		</div>
	);
}

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
							{isZh ? "秘蜂赢客官网" : "秘蜂赢客 website"}
						</h2>
						<p className="mt-2 text-gray-500 text-sm">
							{isZh
								? "了解 秘蜂赢客的服务、客户案例与 GEO 行业观察。"
								: "Explore 秘蜂赢客 services, customer stories and GEO insights."}
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
						className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800"
					>
						<WebsitePreview
							key={activePage}
							src={websiteUrl}
							title={selected.label}
							isZh={isZh}
						/>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
