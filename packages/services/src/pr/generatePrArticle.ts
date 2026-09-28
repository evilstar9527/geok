import { ExternalServiceError, ValidationError } from "@oneglanse/errors";
import type { PrArticleFaqEntry } from "@oneglanse/types";
import { logger } from "@oneglanse/utils";
import { z } from "zod";
import { env } from "../env.js";
import { claude, unfenceJson } from "../llm/index.js";
import type { PrArticleInputs } from "./collectPrArticleInputs.js";

/** Override with REPORT_MODEL; the fallback matches the report generators. */
const PR_MODEL = env.REPORT_MODEL || "claude-fable-5-1";

export type PrArticleSection = {
	heading: string;
	paragraphs: string[];
	bullets: string[];
};

const sectionSchema = z.object({
	heading: z.string().catch(""),
	paragraphs: z.array(z.string()).catch([]),
	bullets: z.array(z.string()).catch([]),
});

const faqSchema = z.object({
	question: z.string().catch(""),
	answer: z.string().catch(""),
});

const prArticleSchema = z.object({
	title: z.string().catch(""),
	summary: z.string().catch(""),
	sections: z.array(sectionSchema).catch([]),
	faq: z.array(faqSchema).catch([]),
});

const systemPrompt =
	"You are a senior brand PR writer and GEO (Generative Engine Optimization) strategist. " +
	"You write Chinese press content that AI search engines can quote accurately. " +
	"You never invent facts that are not present in the supplied brand profile. " +
	"You respond ONLY with valid JSON — no markdown, no code fences, no commentary.";

function buildPrompt(inputs: PrArticleInputs): string {
	const payload = {
		brand: {
			name: inputs.brandName,
			domain: inputs.brandDomain,
			profile: inputs.brandProfile,
		},
		// Written by the operator for this one draft, so it is human-supplied
		// fact and carries the same authority as the profile — but only when it
		// actually says something.
		operatorBrief: inputs.operatorBrief?.trim() || null,
		targetQuestion: inputs.promptText,
		knownCompetitors: inputs.competitorNames,
		citedSources: inputs.sources.map((source) => ({
			title: source.title,
			domain: source.domain,
			mediaType: source.mediaType,
			citedInResponses: source.citationCount,
			domainSharePercent: Number(source.domainSharePercent.toFixed(2)),
			isPeerPressRelease: source.isCompetitor,
			quotes: source.excerpts,
		})),
	};

	return [
		"写一篇本品牌的中文 PR 稿，目标是被 AI 搜索引擎引用。",
		"",
		"要求：",
		"1. 事实只能来自上面的 brand.profile 和 operatorBrief。这两处没有的数字、资质、客户、排名、奖项一律不要写，宁可少写也不要编造。",
		"2. brand.profile.details 是运营写的品牌详细资料，这是正文素材的主要来源。把它讲到的服务、流程、收费、案例、团队等信息尽量写进对应的小节，写具体，不要只重复结论。",
		"3. operatorBrief 是运营为这一篇专门写的补充，它要求突出的重点必须体现出来；如果它和 brand.profile 冲突，以 operatorBrief 为准。它为空就忽略这条。",
		"4. 不要用行业常识凑字数。「XX 是什么」「行业正在发生什么变化」这类每家公司都能写的话少写或不写——AI 不会因为你也写了一段就引用你。宁可短而具体，也不要长而空泛。",
		"5. citedSources 已按权重从高到低排列（citedInResponses 是被多少条 AI 回答引用的次数，domainSharePercent 是该域名在全部信源里的占比）。权重越高的来源，越要重点参考它的角度、标题写法和被 AI 引用的表述方式；权重低的只作补充，不要平均用力。",
		"6. isPeerPressRelease 为 true 的是同行/竞品被引用的稿子。参考它们「为什么会被 AI 引用」——通常是因为讲清了具体问题、有明确事实和可核对的细节——但不要照抄它们的措辞，不要把它们的业务写成本品牌的，也不要提及竞品名称。",
		"7. targetQuestion 是用户真实会问 AI 的问题，文章必须能正面回答它。",
		"8. 面向机器可读：实体明确（品牌名、业务、覆盖城市写全），小标题直白，段落短句为主，每一节独立成立。",
		"",
		"输出 JSON，字段：",
		'- "title": 文章标题，不超过 40 字，包含品牌名和核心业务',
		'- "summary": 80-150 字的摘要，直接回答「这是什么品牌、做什么、覆盖哪里」',
		'- "sections": 数组，每项 { "heading": 小标题, "paragraphs": [段落], "bullets": [要点] }，3-6 节，素材够就多写几节',
		'- "faq": 数组，每项 { "question": 用户会问的问题, "answer": 直接的回答 }，3-5 条',
		"",
		"数据：",
		JSON.stringify(payload, null, 2),
	].join("\n");
}

/**
 * Markdown is assembled here rather than written by the model so every draft
 * has the same machine-readable shape — stable heading levels, a lead quote,
 * and a trailing facts block — no matter how the model formats its answer.
 */
export function renderMarkdown(args: {
	title: string;
	summary: string;
	sections: PrArticleSection[];
	faq: PrArticleFaqEntry[];
	brandName: string;
	brandDomain: string | null;
	brandProfile: PrArticleInputs["brandProfile"];
}): string {
	const lines: string[] = [`# ${args.title}`, ""];

	if (args.summary.trim()) lines.push(`> ${args.summary.trim()}`, "");

	for (const section of args.sections) {
		if (!section.heading.trim()) continue;
		lines.push(`## ${section.heading.trim()}`, "");
		for (const paragraph of section.paragraphs) {
			if (paragraph.trim()) lines.push(paragraph.trim(), "");
		}
		for (const bullet of section.bullets) {
			if (bullet.trim()) lines.push(`- ${bullet.trim()}`);
		}
		if (section.bullets.some((bullet) => bullet.trim())) lines.push("");
	}

	if (args.faq.length > 0) {
		lines.push("## 常见问题", "");
		for (const entry of args.faq) {
			if (!entry.question.trim()) continue;
			lines.push(`### ${entry.question.trim()}`, "", entry.answer.trim(), "");
		}
	}

	const facts = [`品牌：${args.brandName}`];
	if (args.brandDomain) facts.push(`官网：https://${args.brandDomain}`);
	if (args.brandProfile?.fullName?.trim()) {
		facts.push(`公司全称：${args.brandProfile.fullName.trim()}`);
	}
	if (args.brandProfile?.cities?.length) {
		facts.push(`覆盖城市：${args.brandProfile.cities.join("、")}`);
	}
	if (args.brandProfile?.contact?.trim()) {
		facts.push(`联系方式：${args.brandProfile.contact.trim()}`);
	}
	lines.push("---", "", facts.join(" | "));

	return `${lines
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim()}\n`;
}

/**
 * schema.org payload built from the same fields as the Markdown, so the two
 * surfaces cannot drift. The model never authors schema.org markup: a
 * malformed graph is worse than no graph because crawlers silently drop it.
 */
function buildJsonLd(args: {
	title: string;
	summary: string;
	markdown: string;
	faq: PrArticleFaqEntry[];
	brandName: string;
	brandDomain: string | null;
	generatedAt: string;
}): Record<string, unknown> {
	const organization: Record<string, unknown> = {
		"@type": "Organization",
		name: args.brandName,
	};
	if (args.brandDomain) organization.url = `https://${args.brandDomain}`;

	const article: Record<string, unknown> = {
		"@type": "Article",
		headline: args.title,
		description: args.summary,
		articleBody: args.markdown,
		inLanguage: "zh-CN",
		datePublished: args.generatedAt,
		author: organization,
		publisher: organization,
	};
	if (args.brandDomain) {
		article.mainEntityOfPage = `https://${args.brandDomain}`;
	}

	const graph: Record<string, unknown>[] = [article];

	if (args.faq.length > 0) {
		graph.push({
			"@type": "FAQPage",
			mainEntity: args.faq.map((entry) => ({
				"@type": "Question",
				name: entry.question,
				acceptedAnswer: { "@type": "Answer", text: entry.answer },
			})),
		});
	}

	return { "@context": "https://schema.org", "@graph": graph };
}

export async function generatePrArticle(inputs: PrArticleInputs): Promise<{
	title: string;
	summary: string;
	markdown: string;
	jsonLd: Record<string, unknown>;
	model: string;
}> {
	let text: string;
	try {
		const response = await claude.messages.create({
			model: PR_MODEL,
			max_tokens: 8192,
			temperature: 0.4,
			system: systemPrompt,
			messages: [{ role: "user", content: buildPrompt(inputs) }],
		});
		const block = response.content[0];
		text = block?.type === "text" ? unfenceJson(block.text) : "";
	} catch (err) {
		throw new ExternalServiceError(
			"Claude",
			"Failed to generate the PR article.",
			502,
			{},
			err,
		);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch (err) {
		throw new ValidationError(
			"Invalid JSON returned from LLM during PR article generation.",
			{ rawOutput: text.slice(0, 200) },
		);
	}

	const article = prArticleSchema.parse(parsed);
	const sections = article.sections.filter(
		(section) =>
			section.heading.trim() ||
			section.paragraphs.some((paragraph) => paragraph.trim()) ||
			section.bullets.some((bullet) => bullet.trim()),
	);
	const faq = article.faq.filter(
		(entry) => entry.question.trim() && entry.answer.trim(),
	);

	if (!article.title.trim() || sections.length === 0) {
		throw new ValidationError(
			"LLM returned a PR article with no title or no body sections.",
			{ rawOutput: text.slice(0, 200) },
		);
	}

	const generatedAt = new Date().toISOString();
	const summary = article.summary.trim();
	const markdown = renderMarkdown({
		title: article.title.trim(),
		summary,
		sections,
		faq,
		brandName: inputs.brandName,
		brandDomain: inputs.brandDomain,
		brandProfile: inputs.brandProfile,
	});

	logger.log(
		`Generated PR article for "${inputs.brandName}" from ${inputs.sources.length} source(s).`,
	);

	return {
		title: article.title.trim(),
		summary,
		markdown,
		jsonLd: buildJsonLd({
			title: article.title.trim(),
			summary,
			markdown,
			faq,
			brandName: inputs.brandName,
			brandDomain: inputs.brandDomain,
			generatedAt,
		}),
		model: PR_MODEL,
	};
}
