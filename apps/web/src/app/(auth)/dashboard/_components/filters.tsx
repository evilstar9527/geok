import { formToolbarSelectClassName } from "@/components/forms/auth-form-chrome";
import { useLocale } from "@/lib/i18n/locale-context";
import { useSafeSearchParams } from "@/lib/navigation/use-safe-search-params";
import { Button, Separator } from "@oneglanse/ui";
import { cn, getFaviconUrls, modelSelectors } from "@oneglanse/utils";
import { FilterX } from "lucide-react";
import { useRouter } from "next/navigation";

export function DashboardFilters({
	brandName,
	brandDomain,
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
		params.delete("model");
		params.delete("time");
		params.delete("surface");
		params.delete("device");
		params.delete("prompt");

		setModelFilter("All Models");
		setTimeFilter("all");
		setSurfaceFilter("all");
		setDeviceFilter("");
		setPromptFilter("");

		const query = params.toString();
		router.push(query ? `?${query}` : "?", { scroll: false });
	};

	return (
		<div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
			{/* Brand pill */}
			<div
				className={cn(
					formToolbarSelectClassName,
					"flex min-w-0 w-full max-w-full items-center gap-2 px-3.5 sm:w-auto sm:max-w-[240px]",
				)}
			>
				{faviconUrls[0] && (
					<img
						src={faviconUrls[0]}
						alt=""
						className="h-4 w-4 rounded-[var(--app-radius)]"
						onError={(e) => {
							(e.target as HTMLImageElement).style.display = "none";
						}}
					/>
				)}
				<span className="truncate font-medium text-gray-900 dark:text-gray-100">
					{brandName}
				</span>
			</div>

			<select
				aria-label={isZh ? "引擎" : "Engine"}
				value={modelFilter}
				onChange={(event) => setModelFilter(event.target.value)}
				className={`${formToolbarSelectClassName} w-full px-3 text-sm sm:w-auto`}
			>
				{modelSelectors.map(({ value, label }) => (
					<option key={value} value={value}>
						{value === "All Models" && isZh ? "全部引擎" : label}
					</option>
				))}
			</select>
			<select
				aria-label={isZh ? "时间范围" : "Time range"}
				value={timeFilter}
				onChange={(event) =>
					setTimeFilter(event.target.value as typeof timeFilter)
				}
				className={`${formToolbarSelectClassName} w-full px-3 text-sm sm:w-auto`}
			>
				<option value="all">{isZh ? "全部时间" : "All time"}</option>
				<option value="7d">{isZh ? "近 7 天" : "Last 7 days"}</option>
				<option value="14d">{isZh ? "近 14 天" : "Last 14 days"}</option>
				<option value="30d">{isZh ? "近 30 天" : "Last 30 days"}</option>
			</select>

			<select
				aria-label={isZh ? "采集端" : "Execution surface"}
				value={surfaceFilter}
				onChange={(event) =>
					setSurfaceFilter(event.target.value as typeof surfaceFilter)
				}
				className={`${formToolbarSelectClassName} w-full px-3 text-sm sm:w-auto`}
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
					className={`${formToolbarSelectClassName} w-full px-3 text-sm sm:w-auto`}
				>
					<option value="">{isZh ? "全部设备" : "All devices"}</option>
					{devices.map((device) => (
						<option key={device.id} value={device.id}>
							{device.name}
						</option>
					))}
				</select>
			)}

			{prompts.length > 0 && (
				<select
					aria-label={isZh ? "提问" : "Prompt"}
					value={promptFilter}
					onChange={(event) => setPromptFilter(event.target.value)}
					className={`${formToolbarSelectClassName} w-full px-3 text-sm sm:w-auto sm:max-w-64`}
				>
					<option value="">{isZh ? "全部提问" : "All prompts"}</option>
					{prompts.map((prompt) => (
						<option key={prompt.id} value={prompt.id}>
							{prompt.text}
						</option>
					))}
				</select>
			)}

			{(modelFilter !== "All Models" ||
				timeFilter !== "all" ||
				surfaceFilter !== "all" ||
				deviceFilter ||
				promptFilter) && (
				<>
					<Separator orientation="vertical" className="hidden h-4 sm:block" />
					<Button
						variant="ghost"
						size="sm"
						onClick={clearFilters}
						className="w-full gap-2 text-gray-500 transition-colors duration-200 hover:text-gray-700 sm:w-auto"
					>
						<FilterX size={14} />
						{t("Clear")}
					</Button>
				</>
			)}
		</div>
	);
}
