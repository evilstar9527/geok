import { AiVisibilityPreview } from "@/components/previews/ai-visibility-preview";
import { SectionHeading } from "@oneglanse/ui";

export function AiVisibilitySection(): React.JSX.Element {
	return (
		<section
			className="section-shell py-12 sm:py-14"
			id="competitor-comparison"
			aria-labelledby="competitor-comparison-title"
		>
			<SectionHeading
				eyebrow="竞品对比"
				title="看清你的品牌在各家 AI 回答中的位置"
				description="在全部渠道中追踪你领先在哪里、落后在哪里，以及下一步该补什么。"
			/>
			<AiVisibilityPreview />
		</section>
	);
}
