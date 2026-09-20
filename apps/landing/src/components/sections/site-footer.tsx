import { BrandLogo } from "@/components/common/brand-logo";
import { FOOTER_LINKS } from "@/lib/landing-content";
import { UPSTREAM } from "@/lib/site";

export function SiteFooter(): React.JSX.Element {
	return (
		<footer className="border-t border-gray-200 py-8 dark:border-gray-800">
			<div className="section-shell flex flex-col gap-4 text-center text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-left">
				<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
					<span className="flex items-center gap-2">
						<BrandLogo className="h-5 w-5" />
						<p>© {new Date().getFullYear()} 觅蜂引客</p>
					</span>
					<p className="text-xs">
						觅蜂引客基于开源项目{" "}
						<a
							href={UPSTREAM.url}
							className="underline hover:text-foreground"
							target="_blank"
							rel="noreferrer noopener"
						>
							{UPSTREAM.name}
						</a>{" "}
						（{UPSTREAM.license}）二次开发，与上游项目并非同一项目。
					</p>
				</div>
				<nav aria-label="Footer links">
					<ul className="flex flex-wrap items-center justify-center gap-4 sm:justify-end">
						{FOOTER_LINKS.map((link) => (
							<li key={link.label}>
								<a
									href={link.href}
									className="hover:text-foreground"
									target="_blank"
									rel="noreferrer noopener"
								>
									{link.label}
								</a>
							</li>
						))}
					</ul>
				</nav>
			</div>
			<div className="section-shell mt-4 text-center text-xs text-muted-foreground">
				<a
					href="https://beian.miit.gov.cn/"
					target="_blank"
					rel="noreferrer noopener"
					className="hover:text-foreground"
				>
					沪ICP备2026047409号-1
				</a>
			</div>
		</footer>
	);
}
