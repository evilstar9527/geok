"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { useEffect } from "react";

/**
 * Catches render/data errors below the root layout (including the `(auth)`
 * layout, which does session lookup and workspace provisioning). Without this
 * file an unhandled throw fell through to Next's bare default error page —
 * unstyled, in English, with no way to retry.
 *
 * Errors thrown by the root layout itself are handled by global-error.tsx.
 */
export default function AppError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const { t } = useLocale();

	useEffect(() => {
		console.error("[app] unhandled error", error);
	}, [error]);

	return (
		<main className="flex min-h-screen items-center justify-center bg-stone-50 px-6 text-center dark:bg-neutral-950">
			<div className="w-full max-w-xl rounded-[var(--app-radius)] border border-black/5 bg-white/92 px-8 py-10 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.24),0_10px_18px_-14px_rgba(15,23,42,0.12)] backdrop-blur-sm dark:border-white/8 dark:bg-neutral-950/88 dark:shadow-[0_24px_54px_-32px_rgba(0,0,0,0.72)] sm:px-10 sm:py-12">
				<div className="mx-auto inline-flex items-center rounded-[var(--app-radius)] border border-gray-200/80 bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:border-gray-800 dark:bg-neutral-900 dark:text-gray-400">
					Error
				</div>
				<h1 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.03em] text-gray-900 dark:text-gray-100 sm:text-4xl">
					{t("Something went wrong while loading this page.")}
				</h1>
				<p className="mx-auto mt-4 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400 sm:text-base">
					{t(
						"The app hit an unexpected server error. Refresh and try again. If it keeps happening, wait a moment and retry once the deploy settles.",
					)}
				</p>
				{error.digest ? (
					<p className="mt-4 font-mono text-xs text-gray-400 dark:text-gray-500">
						{t("Error reference")}: {error.digest}
					</p>
				) : null}
				<button
					type="button"
					onClick={reset}
					className="mt-7 inline-flex items-center justify-center rounded-[var(--app-radius)] bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
				>
					{t("Try again")}
				</button>
			</div>
		</main>
	);
}
