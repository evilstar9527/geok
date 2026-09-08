import type { ReactNode } from "react";

type AuthPageShellProps = {
	children: ReactNode;
	subtitle?: string;
};

export function AuthPageShell({
	children,
	subtitle,
}: AuthPageShellProps): React.JSX.Element {
	return (
		<div className="flex min-h-svh min-w-0 items-center justify-center overflow-hidden bg-stone-50 px-4 py-6 sm:px-6 sm:py-8 md:px-8 dark:bg-neutral-950">
			<div className="flex w-full min-w-0 max-w-[21.25rem] flex-col gap-5 sm:max-w-[22.5rem] sm:gap-6 lg:max-w-[23.5rem] xl:max-w-[25rem] xl:gap-7">
				<div className="flex flex-col items-center gap-2">
					<div className="flex items-center gap-2.5">
						<img
							src="/logo.png"
							alt="GEO见客"
							className="h-8 w-8 object-contain sm:h-9 sm:w-9 dark:hidden"
						/>
						<img
							src="/logo-dark.png"
							alt="GEO见客"
							className="hidden h-8 w-8 object-contain sm:h-9 sm:w-9 dark:block"
						/>
						<div className="font-semibold text-[1.4rem] text-gray-950 tracking-[-0.05em] sm:text-[1.75rem] lg:text-[1.9rem] xl:text-[2rem] dark:text-gray-50">
							GEO见客
						</div>
					</div>
					{subtitle ? (
						<p className="text-center text-[0.78rem] text-gray-500 sm:text-[0.82rem] xl:text-[0.85rem] dark:text-gray-400">
							{subtitle}
						</p>
					) : null}
				</div>
				{children}
			</div>
		</div>
	);
}
