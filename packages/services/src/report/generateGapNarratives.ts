import { ExternalServiceError, ValidationError } from "@oneglanse/errors";
import type { ReportData, ReportGap, ReportGapKey } from "@oneglanse/types";
import { logger } from "@oneglanse/utils";
import { z } from "zod";
import { env } from "../env.js";
import { claude, unfenceJson } from "../llm/index.js";

/** Override with REPORT_MODEL; the fallback is the previously hardcoded model. */
const NARRATIVE_MODEL = env.REPORT_MODEL || "claude-fable-5-1";

const systemPrompt =
	"You are a senior GEO (Generative Engine Optimization) analyst writing a " +
	"brand visibility report in Simplified Chinese. " +
	"You respond ONLY with valid JSON — no markdown, no code fences, no commentary. " +
	"Every sentence must be grounded in the numbers you are given. " +
	"You NEVER contradict the supplied `direction` field: it is computed from the " +
	"raw data and is authoritative. If direction is 'ahead' the brand is WINNING " +
	"on that metric and the text must read as a strength; if 'tied' the text must " +
	"read as parity, not a deficit; if 'behind' it is a genuine deficit.";

const METRIC_MEANING: Record<ReportGapKey, string> = {
	mention: "品牌在 AI 回答中被提及的比例（越高越好）",
	recommendation: "品牌被 AI 主动推荐的比例（越高越好）",
	rank: "品牌在 AI 回答中的平均出现位次（数字越小越好，#2 优于 #3）",
	sentiment: "AI 回答对品牌的口碑情感得分（越高越好）",
	risk: "检测到的关键风险信号数量（越少越好，0 是理想状态）",
};

const narrativeSchema = z.object({
	key: z.enum(["mention", "recommendation", "rank", "sentiment", "risk"]),
	headline: z.string(),
	insight: z.string(),
});

const narrativeListSchema = z.array(narrativeSchema);

/**
 * Pulls the narrative array out of whatever wrapper the model used. Throws
 * rather than defaulting to empty, so a shape mismatch surfaces in logs
 * instead of silently blanking every headline.
 */
function extractList(parsed: unknown): unknown[] {
	if (Array.isArray(parsed)) return parsed;
	if (parsed && typeof parsed === "object") {
		const record = parsed as Record<string, unknown>;
		if (Array.isArray(record.narratives)) return record.narratives;
		if (Array.isArray(record.gaps)) return record.gaps;
		const firstArray = Object.values(record).find((value) =>
			Array.isArray(value),
		);
		if (Array.isArray(firstArray)) return firstArray;
	}
	throw new ValidationError("LLM gap narrative output contained no array.", {
		shape: JSON.stringify(parsed).slice(0, 200),
	});
}

function buildPrompt(data: ReportData): string {
	const metrics = data.gaps.map((gap) => ({
		key: gap.key,
		指标含义: METRIC_MEANING[gap.key],
		您的数值: gap.brandValue,
		竞品数值: gap.competitorValue,
		竞品名称: gap.competitorName || null,
		direction: gap.direction ?? "neutral",
	}));

	return [
		`品牌名称：${data.brand.name}`,
		`分析回答总数：${data.totalResponses}`,
		"",
		"下面每个对象是一个对比维度。请为每个维度写一句标题和一句解读。",
		"",
		"要求：",
		"1. direction 是根据真实数据算出来的结论，你必须遵守，不得写出与它矛盾的判断。",
		"   - ahead：您的品牌在该维度**领先**竞品，要写成优势",
		"   - tied：双方**基本持平**，要写成持平，不能说落后",
		"   - behind：您的品牌在该维度**落后**，是真实短板",
		"   - neutral：缺少可比数据，客观描述现状即可",
		"2. rank 维度特别注意：数字越小越好，#2 比 #3 更靠前。",
		"3. 竞品数值为 null 时，说明该维度没有竞品对比基线，",
		"   只能描述自身状况，禁止出现任何与竞品比较的说法（如「优于竞品」）。",
		"4. headline：一句话结论，可以引用具体数字，不超过 30 个字。",
		"5. insight：一句话解读这个数字意味着什么，不超过 50 个字。",
		"6. 不要使用模板化的套话，针对具体数字写。不要夸大，不要贬低。",
		"",
		'返回 JSON：{"narratives": [{"key": "...", "headline": "...", "insight": "..."}]}',
		"",
		"数据：",
		JSON.stringify(metrics, null, 2),
	].join("\n");
}

async function runNarrativeModel(prompt: string): Promise<string> {
	try {
		const response = await claude.messages.create({
			model: NARRATIVE_MODEL,
			max_tokens: 2048,
			temperature: 0.3,
			system: systemPrompt,
			messages: [{ role: "user", content: prompt }],
		});
		const block = response.content[0];
		return block?.type === "text" ? unfenceJson(block.text) : "";
	} catch (err) {
		throw new ExternalServiceError(
			"Claude",
			"Failed to generate gap narratives.",
			502,
			{},
			err,
		);
	}
}

/**
 * Writes a per-metric headline and insight for the gap analysis section,
 * grounded in each metric's precomputed `direction`. Returns the gaps with
 * `headline` / `insight` filled in; gaps the model skipped are returned as-is
 * so the UI can fall back to a plain numeric description.
 */
export async function generateGapNarratives(
	data: ReportData,
): Promise<ReportGap[]> {
	if (data.gaps.length === 0) return data.gaps;

	const text = await runNarrativeModel(buildPrompt(data));

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new ValidationError(
			"Invalid JSON returned from LLM during gap narrative generation.",
			{ rawOutput: text.slice(0, 200) },
		);
	}

	const narratives = narrativeListSchema.parse(extractList(parsed));
	const byKey = new Map(narratives.map((n) => [n.key, n]));

	const enriched = data.gaps.map((gap) => {
		const narrative = byKey.get(gap.key);
		if (!narrative) return gap;
		const headline = narrative.headline.trim();
		const insight = narrative.insight.trim();
		return {
			...gap,
			...(headline ? { headline } : {}),
			...(insight ? { insight } : {}),
		};
	});

	logger.log(
		`Generated ${byKey.size}/${data.gaps.length} gap narrative(s) for "${data.brand.name}".`,
	);

	return enriched;
}
