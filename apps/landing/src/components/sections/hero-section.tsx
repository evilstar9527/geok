import { DashboardBrowserPreview } from "@/components/previews/dashboard-browser-preview";

export function HeroSection(): React.JSX.Element {
	return (
		<section className="section-shell pb-12 pt-8 sm:pb-18 sm:pt-14">
			<div className="mx-auto grid max-w-6xl items-center gap-8 px-6 py-8 sm:px-8 sm:py-10 xl:grid-cols-[1.05fr_1fr] xl:gap-12 xl:px-10">
				<div className="ui-stagger">
					<h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
						开源的 AI 可见度与 GEO 追踪工具
					</h1>
					<p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
						免费开源。用你自己的账号、在你自己的基础设施上，追踪品牌在
						ChatGPT、Gemini、Perplexity、Claude、Google AI
						Overview，以及豆包、DeepSeek、Kimi、元宝、千问、点点中的表现。
					</p>
				</div>

				<div className="ui-page-enter">
					<DashboardBrowserPreview />
				</div>
			</div>
		</section>
	);
}
