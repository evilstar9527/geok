import { HorizontalFilterStrip } from "@/components/horizontal-filter-strip";
import { useLocale } from "@/lib/i18n/locale-context";
import { useSafeSearchParams } from "@/lib/navigation/use-safe-search-params";
import {
	DISPLAY_PROVIDER_LIST,
	PROVIDER_DISPLAY,
	getFaviconUrls,
	getModelFavicon,
} from "@oneglanse/utils";
import { CalendarDays, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import type { PromptScope, summarizePromptScope } from "../_utils/prompt-scope";
import styles from "./filters.module.css";

const ALL_MODELS = "All Models";

export function DashboardFilters({
	promptScope,
	setPromptScope,
	scopeSummary,
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
	promptScope: PromptScope;
	setPromptScope: (value: PromptScope) => void;
	scopeSummary: ReturnType<typeof summarizePromptScope>;
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
		for (const key of [
			"model",
			"time",
			"surface",
			"device",
			"prompt",
			"promptGroup",
		]) {
			params.delete(key);
		}
		const query = params.toString();
		router.push(query ? `?${query}` : "?", { scroll: false });
	};

	return (
		<div className={styles.filters}>
			<div className="space-y-3">
				<fieldset
					className="flex flex-wrap items-center gap-2"
					aria-label={isZh ? "问题类型" : "Question type"}
				>
					<span className="geo-filter-label">
						{isZh ? "问题类型：" : "Question type:"}
					</span>
					{(
						[
							[
								"category",
								isZh ? "品类词 · 自然提及" : "Category · Organic mentions",
							],
							[
								"brand",
								isZh ? "品牌词 · 品牌认知" : "Brand · Brand perception",
							],
							["unclassified", isZh ? "未分类" : "Unclassified"],
							["all", isZh ? "全部 · 混合统计" : "All · Mixed statistics"],
						] as const
					).map(([value, label]) => (
						<button
							key={value}
							type="button"
							className="geo-pill"
							aria-pressed={promptScope === value}
							data-active={promptScope === value}
							onClick={() => setPromptScope(value)}
						>
							{label}
						</button>
					))}
				</fieldset>
				<p
					className="text-sm leading-6 text-[var(--geo-th-fg)]"
					aria-live="polite"
				>
					{promptScope === "category"
						? isZh
							? "品类词不点名品牌，用于衡量 AI 自然提及。"
							: "Category prompts do not name the brand and measure organic mentions."
						: promptScope === "brand"
							? isZh
								? "品牌词已在问题中点名品牌；回答提及不等于主动推荐或正面评价。"
								: "Brand prompts name the brand; a mention is not an unsolicited recommendation or a positive review."
							: promptScope === "unclassified"
								? isZh
									? "这些历史记录缺少问题类型标记，单独统计。"
									: "These historical records have no question-type label and are counted separately."
								: isZh
									? "混合统计包含品牌词与未分类记录，不能代表自然提及率。"
									: "Mixed statistics include branded and unclassified prompts and do not measure organic mention rate."}{" "}
					{isZh
						? `当前筛选：${scopeSummary.collected} 条回答，${scopeSummary.analyzed} 条已分析；${promptScope === "category" ? "自然提及率" : "回答提及率"}`
						: `Current filters: ${scopeSummary.collected} responses, ${scopeSummary.analyzed} analyzed; mention rate `}
					<strong>
						{scopeSummary.mentionRate === null
							? "—"
							: `${scopeSummary.mentionRate.toFixed(2)}%`}{" "}
						({scopeSummary.mentions}/{scopeSummary.analyzed})
					</strong>
					{isZh
						? "。未分析回答不计入提及率。"
						: ". Pending analysis is excluded from the rate."}
				</p>
			</div>
			<div className={styles.grid}>
				<div className={styles.brandField}>
					<span className={styles.fieldTitle}>
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
				</div>
				<label className={styles.field}>
					<span className={styles.fieldTitle}>
						<CalendarDays className="size-3.5" />
						{isZh ? "时间范围" : "Time range"}
					</span>
					<select
						aria-label={isZh ? "时间范围" : "Time range"}
						value={timeFilter}
						onChange={(event) =>
							setTimeFilter(event.target.value as typeof timeFilter)
						}
						className="geo-select"
					>
						<option value="all">{isZh ? "全部时间" : "All time"}</option>
						<option value="7d">{isZh ? "最近7天" : "Last 7 days"}</option>
						<option value="14d">{isZh ? "最近14天" : "Last 14 days"}</option>
						<option value="30d">{isZh ? "最近30天" : "Last 30 days"}</option>
					</select>
				</label>

				{prompts.length > 0 && (
					<label className={styles.field}>
						<span className={styles.fieldTitle}>
							{isZh ? "问题" : "Prompt"}
						</span>
						<select
							aria-label={isZh ? "问题" : "Prompt"}
							value={promptFilter}
							onChange={(event) => setPromptFilter(event.target.value)}
							className="geo-select"
						>
							<option value="">{isZh ? "全部问题" : "All prompts"}</option>
							{prompts.map((prompt) => (
								<option key={prompt.id} value={prompt.id}>
									{prompt.text}
								</option>
							))}
						</select>
					</label>
				)}

				<label className={styles.field}>
					<span className={styles.fieldTitle}>
						{isZh ? "采集端" : "Surface"}
					</span>
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
						<option value="android_app">{isZh ? "安卓端" : "Android"}</option>
					</select>
				</label>

				{devices.length > 0 && (
					<label className={styles.field}>
						<span className={styles.fieldTitle}>
							{isZh ? "设备" : "Device"}
						</span>
						<select
							aria-label={isZh ? "设备" : "Device"}
							value={deviceFilter}
							onChange={(event) => setDeviceFilter(event.target.value)}
							className="geo-select"
						>
							<option value="">{isZh ? "全部设备" : "All devices"}</option>
							{devices.map((device) => (
								<option key={device.id} value={device.id}>
									{device.name}
								</option>
							))}
						</select>
					</label>
				)}
			</div>

			<div className={styles.platforms}>
				<span className="geo-filter-label">
					{t("AI platform")}
					{isZh ? "：" : ":"}
				</span>
				<HorizontalFilterStrip>
					<button
						type="button"
						aria-pressed={modelFilter === ALL_MODELS}
						data-active={modelFilter === ALL_MODELS}
						onClick={() => setModelFilter(ALL_MODELS)}
						className="geo-pill"
					>
						{t("All platforms")}
					</button>
					{DISPLAY_PROVIDER_LIST.map((provider) => {
						const display = PROVIDER_DISPLAY[provider];
						const icon = getModelFavicon(provider);
						return (
							<button
								key={provider}
								type="button"
								aria-pressed={modelFilter === provider}
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
				</HorizontalFilterStrip>
				<button
					type="button"
					onClick={clearFilters}
					className={`geo-btn-text ${styles.reset}`}
				>
					<RotateCcw className="size-3.5" />
					{t("Reset")}
				</button>
			</div>
		</div>
	);
}
