import { ExternalServiceError } from "@oneglanse/errors";
import type { ReportData } from "@oneglanse/types";
import { logger } from "@oneglanse/utils";
import { env } from "../env.js";
import { claude } from "../llm/index.js";

/** Override with REPORT_MODEL; the fallback is the previously hardcoded model. */
const SUMMARY_MODEL = env.REPORT_MODEL || "claude-fable-5-1";

const systemPrompt =
	"You are a senior GEO (Generative Engine Optimization) analyst writing a " +
	"brand visibility report in Simplified Chinese. " +
	"Write a short, blunt executive summary grounded ONLY in the numbers you are given. " +
	"Never invent data, never use template filler, never contradict the numbers. " +
	"Do not use markdown or bullet lists — write two to four flowing sentences.";

function buildPrompt(data: ReportData): string {
	const brandRate =
		data.mentionRates.find((entry) => entry.isBrand)?.mentionRate ?? 0;
	const sentimentBuckets = data.sentimentDistribution ?? [];
	const positiveCount = sentimentBuckets
		.filter((b) => b.bucket === "60-80" || b.bucket === "81-100")
		.reduce((sum, b) => sum + b.count, 0);
	const negativeCount = sentimentBuckets
		.filter((b) => b.bucket === "0-20" || b.bucket === "21-40")
		.reduce((sum, b) => sum + b.count, 0);
	const positiveThemeCount = data.positiveThemes?.length ?? 0;
	const topTheme = data.positiveThemes?.[0];
	const contact = data.contactInfo;

	const facts = {
		品牌: data.brand.name,
		分析回答总数: data.totalResponses,
		被提到: {
			提及率: `${brandRate}%`,
			排名分布: (data.rankDistribution ?? []).map(
				(b) => `第${b.rank}位${b.count}次`,
			),
		},
		被信任: {
			平均口碑得分:
				data.gaps.find((g) => g.key === "sentiment")?.brandValue ?? null,
			正面回答数: positiveCount,
			负面回答数: negativeCount,
			正面主题数: positiveThemeCount,
			最突出正面印象: topTheme
				? `${topTheme.theme}（${topTheme.count}次）`
				: null,
			风险信号: data.riskCounts ?? null,
		},
		被联系到: contact
			? {
					给出电话的回答数: contact.phoneCount,
					未给电话的回答数: contact.missingPhoneCount,
					不同电话版本数: contact.phones.length,
				}
			: null,
	};

	return [
		"基于下面这份品牌 AI 可见度数据，写一段 2-4 句的执行摘要，",
		"概括品牌在三个关卡上的现状：被提到（提及率与排名）、被信任（口碑正负面）、被联系到（联系方式是否被 AI 准确给出）。",
		"要求：只陈述数据里有的结论，语气直接，不说空话套话；对落后的地方如实指出。",
		"",
		"数据：",
		JSON.stringify(facts, null, 2),
	].join("\n");
}

async function runSummaryModel(prompt: string): Promise<string> {
	try {
		const response = await claude.messages.create({
			model: SUMMARY_MODEL,
			max_tokens: 1024,
			temperature: 0.3,
			system: systemPrompt,
			messages: [{ role: "user", content: prompt }],
		});
		const block = response.content[0];
		return block?.type === "text" ? block.text.trim() : "";
	} catch (err) {
		throw new ExternalServiceError(
			"Claude",
			"Failed to generate executive summary.",
			502,
			{},
			err,
		);
	}
}

export async function generateExecutiveSummary(
	data: ReportData,
): Promise<string> {
	const text = await runSummaryModel(buildPrompt(data));
	logger.log(`Generated executive summary for "${data.brand.name}".`);
	return text;
}
