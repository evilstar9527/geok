import { db, schema } from "@oneglanse/db";
import type { PrArticleData } from "@oneglanse/types";
import { newId } from "@oneglanse/utils";
import { collectPrArticleInputs } from "./collectPrArticleInputs.js";
import { generatePrArticle } from "./generatePrArticle.js";

export async function createPrArticle(args: {
	workspaceId: string;
	promptId: string;
	createdBy: string | null;
}): Promise<{ id: string }> {
	const inputs = await collectPrArticleInputs(args);
	const generated = await generatePrArticle(inputs);

	const id = newId("pr");
	const data: PrArticleData = {
		title: generated.title,
		summary: generated.summary,
		markdown: generated.markdown,
		jsonLd: generated.jsonLd,
		sources: inputs.sources,
		brandName: inputs.brandName,
		brandDomain: inputs.brandDomain,
		promptId: args.promptId,
		promptText: inputs.promptText,
		model: generated.model,
		generatedAt: new Date().toISOString(),
	};

	await db.insert(schema.prArticles).values({
		id,
		workspaceId: args.workspaceId,
		promptId: args.promptId,
		promptText: inputs.promptText,
		title: generated.title,
		data: JSON.stringify(data),
		createdBy: args.createdBy,
	});

	return { id };
}
