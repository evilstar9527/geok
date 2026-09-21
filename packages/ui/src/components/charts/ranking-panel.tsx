"use client";

import { cn } from "@oneglanse/utils";

export interface RankingRow {
	name: string;
	/** Percentage value, already scaled 0-100. */
	value: number;
	/** Marks the monitored brand so its row stands out. */
	isSelf?: boolean;
}

interface RankingPanelProps {
	title: string;
	rows: RankingRow[];
	/** Header for the value column, e.g. "提及率". */
	valueLabel: string;
	/** Hides the proportion bar (used where the value column is narrow). */
	hideMeter?: boolean;
	/** Caps the rows shown; the rest scroll. */
	maxHeight?: number;
	selfTagText?: string;
	className?: string;
	emptyText?: string;
}

/** Leaderboard that sits beside a trend chart on the monitoring pages. */
export function RankingPanel({
	title,
	rows,
	valueLabel,
	hideMeter,
	maxHeight,
	selfTagText = "当前品牌",
	className,
	emptyText = "暂无数据",
}: RankingPanelProps) {
	const peak = rows.reduce((max, row) => Math.max(max, row.value), 0);

	return (
		<div className={cn("geo-card flex min-w-0 flex-col", className)}>
			<div className="geo-card-head">
				<span className="geo-card-title">{title}</span>
			</div>
			<div
				className="min-w-0 flex-1 overflow-y-auto"
				style={maxHeight ? { maxHeight } : undefined}
			>
				{rows.length === 0 ? (
					<div className="flex h-24 items-center justify-center text-[13px] text-[var(--geo-th-fg)]">
						{emptyText}
					</div>
				) : (
					<table className="geo-table">
						<thead>
							<tr>
								<th className="w-14 text-center">排名</th>
								<th className="text-center">品牌</th>
								<th className="w-28 text-center">{valueLabel}</th>
								{!hideMeter && <th className="w-24" />}
							</tr>
						</thead>
						<tbody>
							{rows.map((row, index) => (
								<tr key={row.name} data-self={row.isSelf ? "true" : undefined}>
									<td className="text-center">
										<span className="geo-rank" data-rank={index + 1}>
											{index + 1}
										</span>
									</td>
									<td className="text-center">
										<span className="align-middle">{row.name}</span>
										{row.isSelf && (
											<span className="geo-self-tag">{selfTagText}</span>
										)}
									</td>
									<td className="text-center font-medium tabular-nums">
										{row.value.toFixed(2)}%
									</td>
									{!hideMeter && (
										<td>
											<div className="geo-meter">
												<div
													className="geo-meter-fill"
													style={{
														width: `${peak > 0 ? (row.value / peak) * 100 : 0}%`,
													}}
												/>
											</div>
										</td>
									)}
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}
