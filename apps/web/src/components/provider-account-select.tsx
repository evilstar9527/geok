"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { PROVIDER_ACCOUNT_IDS, type ProviderAccountId } from "@oneglanse/types";

export function ProviderAccountSelect({
	value,
	onChange,
	disabled,
}: {
	value: ProviderAccountId;
	onChange: (value: ProviderAccountId) => void;
	disabled?: boolean;
}) {
	const { locale } = useLocale();
	const isZh = locale === "zh-CN";
	return (
		<label className="flex flex-wrap items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
			{isZh ? "浏览器账号" : "Browser account"}
			<select
				className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
				value={value}
				disabled={disabled}
				onChange={(event) => onChange(event.target.value as ProviderAccountId)}
			>
				{PROVIDER_ACCOUNT_IDS.map((id, index) => (
					<option key={id} value={id}>
						{index === 0
							? isZh
								? "原有账号"
								: "Original account"
							: isZh
								? `账号 ${index}`
								: `Account ${index}`}
					</option>
				))}
			</select>
			<span className="text-xs text-gray-500">
				{isZh
					? "各账号的登录状态独立保存"
					: "Login sessions are saved separately for each account"}
			</span>
		</label>
	);
}
