"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./select.js";

export type TimeRange = "all" | "7d" | "14d" | "30d";

export function TimeRangeSelect({
	value,
	onValueChange,
	triggerClassName,
	contentClassName,
	placeholder = "时间范围",
}: {
	value: TimeRange;
	onValueChange: (value: TimeRange) => void;
	triggerClassName?: string;
	contentClassName?: string;
	placeholder?: string;
}): React.JSX.Element {
	return (
		<Select
			value={value}
			onValueChange={(next) => onValueChange(next as TimeRange)}
		>
			<SelectTrigger className={triggerClassName}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent className={contentClassName}>
				<SelectItem value="all">全部时间</SelectItem>
				<SelectItem value="7d">最近7天</SelectItem>
				<SelectItem value="14d">最近14天</SelectItem>
				<SelectItem value="30d">最近30天</SelectItem>
			</SelectContent>
		</Select>
	);
}
