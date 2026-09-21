import { useLocale } from "@/lib/i18n/locale-context";
import { useSafeSearchParams } from "@/lib/navigation/use-safe-search-params";
import { PROVIDER_LIST } from "@oneglanse/types";
import { PROVIDER_DISPLAY, getFaviconUrls } from "@oneglanse/utils";
import { CalendarDays, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

const ALL_MODELS = "All Models";

export function DashboardFilters({
	brandName,
	brandDomain,
	competitorCount,
	modelFilter,
	setModelFilter,
	timeFilter,
	setTimeFilter,
	surfaceFilter,
	setSurfaceFilter,
	deviceFilter,
	setDeviceFilter,
	devices,
	promptFilter,
	setPromptFilter,
	prompts,
}: {
	brandName: string;
	brandDomain: string;
	/** Competitors tracked alongside the brand, shown as "+N 个竞品". */
	competitorCount?: number;
	modelFilter: string;
	setModelFilter: (v: string) => void;
	timeFilter: "all" | "7d" | "14d" | "30d";
	setTimeFilter: (v: "all" | "7d" | "14d" | "30d") => void;
	surfaceFilter: "all" | "web" | "android_app";
	setSurfaceFilter: (v: "all" | "web" | "android_app") => void;
	deviceFilter: string;
	setDeviceFilter: (v: string) => void;
	devices: Array<{ id: string; name: string }>;
	promptFilter: string;
	setPromptFilter: (v: string) => void;
	prompts: Array<{ id: string; text: string }>;
}) {
	const router = useRouter();
	const { t, locale } = useLocale();
	const isZh = locale === "zh-CN";
	const searchParams = useSafeSearchParams();
	const faviconUrls = getFaviconUrls(brandDomain);

	const clearFilters = () => {
		const params = new URLSearchParams(searchParams.toString());
		for (const key of ["model", "time", "surface", "device", "prompt"]) {
			params.delete(key);
		}
		setModelFilter(ALL_MODELS);
		setTimeFilter("all");
		setSurfaceFilter("all");
		setDeviceFilter("");
		setPromptFilter("");
		const query = params.toString();
		router.push(query ? `?${query}` : "?", { scroll: false });
	};

	return (
		<div className="geo-filter-bar">
			<div className="geo-filter-row">
				<span className="geo-filter-label">
					{t("Monitored brand")}
					{isZh ? "：" : ":"}
				</span>
				<span className="geo-brand-pill">
					{faviconUrls[0] && (
						<img
							key={faviconUrls[0]}
							src={faviconUrls[0]}
							alt=""
							className="size-4 shrink-0 object-contain"
							onError={(event) => {
								(event.target as HTMLImageElement).style.display = "none";
							}}
						/>
					)}
					<span className="truncate font-medium text-neutral-900 dark:text-neutral-100">
						{brandName}
					</span>
					{!!competitorCount && competitorCount > 0 && (
						<span className="shrink-0 text-[12px] text-[var(--geo-th-fg)]">
							+{competitorCount}
							{isZh ? t("competitors suffix") : " competitors"}
						</span>
					)}
				</span>

				<span className="relative inline-flex items-center">
					<CalendarDays className="pointer-events-none absolute left-2.5 size-3.5 text-[var(--geo-th-fg)]" />
					<select
						aria-label={isZh ? "时间范围" : "Time range"}
						value={timeFilter}
						onChange={(event) =>
							setTimeFilter(event.target.value as typeof timeFilter)
						}
						className="geo-select pl-8"
					>
						<option value="all">{isZh ? "全部时间" : "All time"}</option>
						<option value="7d">{isZh ? "最近7天" : "Last 7 days"}</option>
						<option value="14d">{isZh ? "最近14天" : "Last 14 days"}</option>
						<option value="30d">{isZh ? "最近30天" : "Last 30 days"}</option>
					</select>
				</span>

				{prompts.length > 0 && (
					<select
						aria-label={isZh ? "问题" : "Prompt"}
						value={promptFilter}
						onChange={(event) => setPromptFilter(event.target.value)}
						className="geo-select max-w-[220px]"
					>
						<option value="">{isZh ? "全部问题" : "All prompts"}</option>
						{prompts.map((prompt) => (
							<option key={prompt.id} value={prompt.id}>
								{prompt.text}
							</option>
						))}
					</select>
				)}

				<select
					aria-label={isZh ? "采集端" : "Execution surface"}
					value={surfaceFilter}
					onChange={(event) =>
						setSurfaceFilter(event.target.value as typeof surfaceFilter)
					}
					className="geo-select"
				>
					<option value="all">{isZh ? "全部采集端" : "All surfaces"}</option>
					<option value="web">{isZh ? "网页端" : "Web"}</option>
					<option value="android_app">Android</option>
				</select>

				{devices.length > 0 && (
					<select
						aria-label={isZh ? "设备" : "Device"}
						value={deviceFilter}
						onChange={(event) => setDeviceFilter(event.target.value)}
						className="geo-select max-w-[180px]"
					>
						<option value="">{isZh ? "全部设备" : "All devices"}</option>
						{devices.map((device) => (
							<option key={device.id} value={device.id}>
								{device.name}
							</option>
						))}
					</select>
				)}
			</div>

			<div className="geo-filter-row">
				<span className="geo-filter-label">
					{t("AI platform")}
					{isZh ? "：" : ":"}
				</span>
				<button
					type="button"
					data-active={modelFilter === ALL_MODELS}
					onClick={() => setModelFilter(ALL_MODELS)}
					className="geo-pill"
				>
					{t("All platforms")}
				</button>
				{PROVIDER_LIST.map((provider) => {
					const display = PROVIDER_DISPLAY[provider];
					const icon = getFaviconUrls(display.domain)[0];
					return (
						<button
							key={provider}
							type="button"
							data-active={modelFilter === provider}
							onClick={() => setModelFilter(provider)}
							className="geo-pill"
						>
							{icon && (
								<img
									src={icon}
									alt=""
									className="size-4 rounded-sm"
									onError={(event) => {
										(event.target as HTMLImageElement).style.display = "none";
									}}
								/>
							)}
							{display.displayName}
						</button>
					);
				})}
				<button
					type="button"
					onClick={clearFilters}
					className="geo-pill ml-auto gap-1"
				>
					<RotateCcw className="size-3.5" />
					{t("Reset")}
				</button>
			</div>
		</div>
	);
}
