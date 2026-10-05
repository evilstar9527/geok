import { Skeleton } from "@oneglanse/ui";
import { AuthPageShell } from "./auth-page-shell";

export function AuthPageLoading(): React.JSX.Element {
	return (
		<AuthPageShell subtitle="品牌生成式引擎优化管理平台">
			<div className="space-y-4 p-7">
				<div className="space-y-3">
					<Skeleton className="h-11 w-full rounded-[var(--app-radius)]" />
				</div>
				<div className="space-y-3">
					<Skeleton className="h-11 w-full rounded-[var(--app-radius)]" />
					<Skeleton className="h-11 w-full rounded-[var(--app-radius)]" />
					<Skeleton className="h-11 w-full rounded-[var(--app-radius)]" />
				</div>
			</div>
		</AuthPageShell>
	);
}
