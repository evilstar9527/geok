import { SourceIntelligencePreview } from "@/components/previews/source-intelligence-preview";
import { SectionHeading } from "@oneglanse/ui";

export function SourceIntelligenceSection(): React.JSX.Element {
	return (
		<section
			className="section-shell py-12 sm:py-14"
			id="source-intelligence"
			aria-labelledby="source-intelligence-title"
		>
			<SectionHeading
				eyebrow="来源与引用"
				title="看清是哪些来源在影响 AI 的判断"
				description="找出在全部渠道中真正推动你品牌可见度的信息源。"
			/>
			<SourceIntelligencePreview />
		</section>
	);
}
