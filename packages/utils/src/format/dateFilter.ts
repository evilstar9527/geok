import { parseDateString } from "./formatDate.js";

export function isWithinRange(dateStr: string, days: number): boolean {
	const date = parseDateString(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = diffMs / (1000 * 60 * 60 * 24);
	return diffDays <= days;
}

/**
 * True when `dateStr` falls in the half-open window `(fromDays, toDays]` before now —
 * i.e. the period immediately preceding `isWithinRange(dateStr, fromDays)`. The lower
 * bound is exclusive so the two windows never both count the same boundary record.
 */
export function isWithinWindow(
	dateStr: string,
	fromDays: number,
	toDays: number,
): boolean {
	const date = parseDateString(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = diffMs / (1000 * 60 * 60 * 24);
	return diffDays > fromDays && diffDays <= toDays;
}
