import { PREVIEW_PERCEPTION } from "@/lib/preview-data";
import { BrandPerceptionCard } from "@oneglanse/ui";
import { CheckCircle2 } from "lucide-react";

export function AiPerceptionSection(): React.JSX.Element {
	return (
		<section
			className="section-shell py-12 sm:py-14"
			id="ai-perception"
			aria-labelledby="ai-perception-title"
		>
			<div className="grid items-start gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
				<div className="flex min-h-0 flex-col justify-center lg:min-h-[500px]">
					<div>
						<h2
							id="ai-perception-title"
							className="text-2xl font-semibold tracking-tight sm:text-3xl"
						>
							AI 品牌认知
						</h2>
						<p className="mt-2 max-w-xl text-sm font-medium leading-6 text-muted-foreground sm:text-base">
							看清各渠道在真实回答中如何描述你的品牌、价格定位与核心差异点。
						</p>
					</div>

					<ul className="mt-6 space-y-3">
						<li className="flex items-start gap-2.5 text-sm text-gray-800 dark:text-gray-200">
							<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
							叙述主题直接取自真实产品的回答原文，不是二次加工的摘要
						</li>
						<li className="flex items-start gap-2.5 text-sm text-gray-800 dark:text-gray-200">
							<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
							把价格与定位信号转成可以直接用来做决策的判断依据
						</li>
						<li className="flex items-start gap-2.5 text-sm text-gray-800 dark:text-gray-200">
							<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
							跨渠道追踪反复出现的品牌描述，识别口径一致还是已经漂移
						</li>
						<li className="flex items-start gap-2.5 text-sm text-gray-800 dark:text-gray-200">
							<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
							差异点以买家在 AI 回答里真正看到的措辞呈现
						</li>
						<li className="flex items-start gap-2.5 text-sm text-gray-800 dark:text-gray-200">
							<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
							在认知变化影响到获客之前，先把高价值的信号标出来
						</li>
					</ul>
				</div>

				<div className="min-w-0">
					<BrandPerceptionCard
						locale="zh-CN"
						bestKnownFor={PREVIEW_PERCEPTION.bestKnownFor}
						pricingPerception={PREVIEW_PERCEPTION.pricingPerception}
						coreClaims={[...PREVIEW_PERCEPTION.coreClaims]}
						differentiators={[...PREVIEW_PERCEPTION.differentiators]}
					/>
				</div>
			</div>
		</section>
	);
}
