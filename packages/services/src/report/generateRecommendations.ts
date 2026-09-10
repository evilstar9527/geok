import { ExternalServiceError, ValidationError } from "@oneglanse/errors";
import type {
	ReportData,
	ReportRecommendation,
	ReportRecommendationPriority,
} from "@oneglanse/types";
import { logger } from "@oneglanse/utils";
import { z } from "zod";
import { env } from "../env.js";
import { claude, unfenceJson } from "../llm/index.js";

/** Override with REPORT_MODEL; the fallback is the previously hardcoded model. */
const RECOMMENDATION_MODEL = env.REPORT_MODEL || "claude-fable-5-1";

const systemPrompt =
	"You are a senior GEO (Generative Engine Optimization) strategist. " +
	"You respond ONLY with valid JSON — no markdown, no code fences, no commentary. " +
	"Recommendations must be grounded in the provided data, specific, and actionable.";

const recommendationSchema = z.object({
	priority: z.enum(["high", "medium", "low"]).catch("medium"),
	title: z.string().catch(""),
	rationale: z.string().catch(""),
	action: z.string().catch(""),
	kpi: z.string().catch(""),
});

const recommendationListSchema = z.array(recommendationSchema);

/**
 * Models wrap the list inconsistently: sometimes a bare array, sometimes
 * `{ recommendations: [...] }`, sometimes another single key. Pull out the
 * first array we find rather than defaulting to empty, so a genuine shape
 * mismatch surfaces as an error instead of an empty report section.
 */
function extractList(parsed: unknown): unknown[] {
	if (Array.isArray(parsed)) return parsed;
	if (parsed && typeof parsed === "object") {
		const record = parsed as Record<string, unknown>;
		if (Array.isArray(record.recommendations)) return record.recommendations;
		const firstArray = Object.values(record).find((value) =>
			Array.isArray(value),
		);
		if (Array.isArray(firstArray)) return firstArray;
	}
	throw new ValidationError(
		"LLM recommendation output contained no recommendation array.",
		{ shape: JSON.stringify(parsed).slice(0, 200) },
	);
}

const PRIORITY_ORDER: Record<ReportRecommendationPriority, number> = {
	high: 0,
	medium: 1,
	low: 2,
};

function buildPrompt(data: ReportData): string {
	const summary = {
		brand: data.brand.name,
		domain: data.brand.domain,
		totalResponses: data.totalResponses,
		mentionRates: data.mentionRates,
		gaps: data.gaps,
		brandPerception: data.brandPerception ?? null,
		topSources: (data.sourcesIntelligence ?? []).slice(0, 10),
		perModelVisibility: data.perModelVisibility ?? [],
	};

	return [
		"基于下面这份品牌 AI 可见度数据，给出最多 6 条按优先级排序的可执行 GEO 优化建议。",
		"每条建议用 JSON 字段表示：",
		'- "priority": "high" | "medium" | "low"',
		'- "title": 一句动作标题（做什么）',
		'- "rationale": 一句话说明为什么（引用数据依据）',
		'- "action": 2-3 句具体怎么做',
		'- "kpi": 用哪个指标衡量改进（怎么衡量）',
		"",
		"数据：",
		JSON.stringify(summary, null, 2),
	].join("\n");
}

async function runRecommendationModel(prompt: string): Promise<string> {
	try {
		const response = await claude.messages.create({
			model: RECOMMENDATION_MODEL,
			max_tokens: 4096,
			temperature: 0.3,
			system: systemPrompt,
			messages: [{ role: "user", content: prompt }],
		});
		const block = response.content[0];
		return block?.type === "text" ? unfenceJson(block.text) : "";
	} catch (err) {
		throw new ExternalServiceError(
			"Claude",
			"Failed to generate report recommendations.",
			502,
			{},
			err,
		);
	}
}

export async function generateRecommendations(
	data: ReportData,
): Promise<ReportRecommendation[]> {
	const text = await runRecommendationModel(buildPrompt(data));

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch (err) {
		throw new ValidationError(
			"Invalid JSON returned from LLM during recommendation generation.",
			{ rawOutput: text.slice(0, 200) },
		);
	}

	const recommendations = recommendationListSchema
		.parse(extractList(parsed))
		.filter((r) => r.title.trim().length > 0)
		.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
		.slice(0, 6);

	logger.log(
		`Generated ${recommendations.length} report recommendation(s) for "${data.brand.name}".`,
	);

	return recommendations;
}
