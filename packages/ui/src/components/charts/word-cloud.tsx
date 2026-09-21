"use client";

import { cn } from "@oneglanse/utils";
import { BRAND_COLORS } from "./chart-theme.js";

export interface WordCloudItem {
	text: string;
	/** Relative weight; drives font size only, never shown. */
	value: number;
}

interface WordCloudProps {
	items: WordCloudItem[];
	height?: number;
	className?: string;
	emptyText?: string;
}

const MIN_FONT = 12;
const MAX_FONT = 30;

/**
 * Weighted tag cloud laid out with flex wrap.
 *
 * Heaviest terms are placed in the middle of the flow and lighter ones pushed to
 * the edges, which reproduces the centre-weighted look of a packed cloud without
 * a layout engine.
 */
export function WordCloud({
	items,
	height = 300,
	className,
	emptyText = "暂无关键词",
}: WordCloudProps) {
	if (items.length === 0) {
		return (
			<div
				className="flex items-center justify-center text-[13px] text-[var(--geo-th-fg)]"
				style={{ height }}
			>
				{emptyText}
			</div>
		);
	}

	const ranked = [...items].sort((a, b) => b.value - a.value);
	const top = ranked[0]?.value ?? 1;
	const floor = ranked[ranked.length - 1]?.value ?? 0;
	const span = Math.max(top - floor, 1);

	// Alternate left/right from the centre so the heaviest words end up mid-block.
	const arranged: typeof ranked = [];
	ranked.forEach((item, index) => {
		if (index % 2 === 0) arranged.push(item);
		else arranged.unshift(item);
	});

	return (
		<div
			className={cn(
				"flex flex-wrap content-center items-center justify-center gap-x-2.5 gap-y-1 overflow-hidden px-4",
				className,
			)}
			style={{ height }}
		>
			{arranged.map((item) => {
				// Square-rooted so a few very frequent terms do not crowd out the rest.
				const weight = Math.sqrt((item.value - floor) / span);
				const size = Math.round(MIN_FONT + weight * (MAX_FONT - MIN_FONT));
				const color = BRAND_COLORS[
					Math.abs(hashText(item.text)) % BRAND_COLORS.length
				] as string;
				return (
					<span
						key={item.text}
						title={item.text}
						className="whitespace-nowrap font-semibold leading-tight"
						style={{ fontSize: size, color }}
					>
						{item.text}
					</span>
				);
			})}
		</div>
	);
}

/** Stable per-term colour: the same word keeps its colour between renders. */
function hashText(text: string): number {
	let hash = 0;
	for (let i = 0; i < text.length; i++) {
		hash = (hash << 5) - hash + text.charCodeAt(i);
		hash |= 0;
	}
	return hash;
}
