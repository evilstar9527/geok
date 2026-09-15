import { PREVIEW_PROMPT_RESPONSES } from "@/lib/preview-data";
import { PromptResponsesPreview } from "@oneglanse/ui";

export function PromptResponsesSection(): React.JSX.Element {
	return (
		<section
			className="section-shell py-12 sm:py-14"
			id="prompt-responses"
			aria-labelledby="prompt-responses-title"
		>
			<PromptResponsesPreview
				title="真实的 AI 产品界面回答"
				description="查看用户在界面上实际看到的回答原文，引用来源与分析指标在同一视图内呈现。"
				locale="zh-CN"
				rows={PREVIEW_PROMPT_RESPONSES.map((row) => ({
					id: row.id,
					modelProvider: row.modelProvider,
					modelName: row.modelName,
					promptRunAt: row.promptRunAt,
					response: row.response,
					isAnalysed: row.isAnalysed,
					metrics: row.metrics,
					sources: [...row.sources],
				}))}
			/>
		</section>
	);
}
