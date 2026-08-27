"use client";

import { formToolbarButtonClassName } from "@/components/forms/auth-form-chrome";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn } from "@oneglanse/utils";
import { Languages } from "lucide-react";

export function LanguageToggle({ className }: { className?: string }) {
	const { locale, setLocale } = useLocale();
	const isZh = locale === "zh-CN";

	return (
		<button
			type="button"
			onClick={() => setLocale(isZh ? "en" : "zh-CN")}
			className={cn(
				formToolbarButtonClassName,
				"flex h-9 items-center gap-2 px-3 text-xs font-medium",
				className,
			)}
			aria-label={isZh ? "Switch to English" : "切换到中文"}
			title={isZh ? "Switch to English" : "切换到中文"}
		>
			<Languages className="h-4 w-4 shrink-0" />
			<span>{isZh ? "English" : "中文"}</span>
		</button>
	);
}
