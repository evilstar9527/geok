export const PositionMetricCell = ({
	position,
}: { position: number | string }) => {
	if (position === "-" || position === undefined) {
		return <span className="text-gray-400 text-sm">-</span>;
	}

	const num = Number(position);
	// A top-3 position is the one thing in the column worth spotting, so it takes
	// the brand's yellow chip rather than a second accent colour.
	const color =
		num <= 3
			? "bg-[var(--geo-accent)] text-[var(--geo-on-accent)]"
			: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";

	return (
		<div
			className={`inline-flex items-center justify-center w-6 h-6 rounded-[var(--app-radius)] text-xs font-medium ${color}`}
		>
			{num}
		</div>
	);
};

export const SentimentMetricCell = ({
	sentiment,
}: { sentiment: number | string }) => {
	if (sentiment === "-" || sentiment === undefined) {
		return <div className="text-gray-400 text-sm">-</div>;
	}

	const num = Number(sentiment);
	let bgClass = "";
	let dotClass = "";

	if (num >= 70) {
		bgClass =
			"bg-emerald-50 text-emerald-700 dark:bg-emerald-950/55 dark:text-emerald-300";
		dotClass = "bg-emerald-500 dark:bg-emerald-400";
	} else if (num >= 40) {
		bgClass =
			"bg-amber-50 text-amber-700 dark:bg-amber-950/55 dark:text-amber-300";
		dotClass = "bg-amber-500 dark:bg-amber-400";
	} else {
		bgClass = "bg-rose-50 text-rose-700 dark:bg-rose-950/55 dark:text-rose-300";
		dotClass = "bg-rose-500 dark:bg-rose-400";
	}

	return (
		<div
			className={`inline-flex items-center gap-2 px-2 py-1 rounded-[var(--app-radius)] text-sm font-medium ${bgClass}`}
		>
			<span className={`w-2 h-2 rounded-[var(--app-radius)] ${dotClass}`} />
			{num}
		</div>
	);
};
