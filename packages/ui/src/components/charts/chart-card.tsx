"use client";

import { cn } from "@oneglanse/utils";
import type { ReactNode } from "react";

interface ChartCardProps {
	title: string;
	/** Caption under the chart, e.g. "展示最近7天数据". */
	note?: string;
	/** Controls pinned to the right of the note row. */
	footerActions?: ReactNode;
	/** Controls pinned to the right of the title row. */
	headerActions?: ReactNode;
	className?: string;
	bodyClassName?: string;
	children: ReactNode;
}

/** Panel chrome shared by every chart on the monitoring pages. */
export function ChartCard({
	title,
	note,
	footerActions,
	headerActions,
	className,
	bodyClassName,
	children,
}: ChartCardProps) {
	return (
		<div className={cn("geo-card flex min-w-0 flex-col", className)}>
			<div className="geo-card-head">
				<span className="geo-card-title">{title}</span>
				{headerActions}
			</div>
			<div className={cn("min-w-0 flex-1 px-2", bodyClassName)}>{children}</div>
			{(note || footerActions) && (
				<div className="flex items-center justify-between gap-2 px-4 pt-1 pb-3">
					<span className="text-[12px] text-[var(--geo-th-fg)]">{note}</span>
					{footerActions}
				</div>
			)}
		</div>
	);
}
