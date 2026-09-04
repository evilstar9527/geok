import { ExternalServiceError, ValidationError } from "@oneglanse/errors";
import type {
	AnalysisInputSingle,
	BrandAnalysisResult,
} from "@oneglanse/types";
import { logger } from "@oneglanse/utils";
import { z } from "zod";
import { env } from "../env.js";
import { chatgpt, claude, isOpenRouterConfigured } from "../llm/index.js";
import { analysisPrompt } from "./analysisPrompt.js";

const systemPrompt =
	"You are an expert brand intelligence analyst. " +
	"You respond ONLY with valid JSON — no markdown, no code fences, no commentary. " +
	"Return only valid JSON matching the requested schema. " +
	"Be precise, evidence-based, and conservative in your scoring. " +
	"If the brand is not mentioned in the response, return zeroed-out scores and empty arrays rather than fabricating data.";

async function runWithOpenAI(
	prompt: string,
	responseLength: number,
): Promise<string> {
	try {
		if (isOpenRouterConfigured()) {
			const response = await chatgpt.chat.completions.create({
				model: env.ANALYSIS_MODEL || "openai/gpt-4.1-mini",
				temperature: 0,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: prompt },
				],
				response_format: { type: "json_object" },
			});
			return response.choices[0]?.message?.content?.trim() || "";
		}

		const response = await chatgpt.responses.create({
			model: env.ANALYSIS_MODEL || "gpt-4.1",
			temperature: 0,
			input: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: prompt },
			],
			text: { format: { type: "json_object" } },
		});
		return response.output_text?.trim() || "";
	} catch (err) {
		throw new ExternalServiceError(
			isOpenRouterConfigured() ? "OpenRouter" : "ChatGPT",
			"Failed to analyze response.",
			502,
			{ responseLength },
			err,
		);
	}
}

async function runWithClaude(
	prompt: string,
	responseLength: number,
): Promise<string> {
	try {
		const response = await claude.messages.create({
			model: "claude-sonnet-4-6",
			max_tokens: 4096,
			temperature: 0,
			system: systemPrompt,
			messages: [{ role: "user", content: prompt }],
		});
		const block = response.content[0];
		return block?.type === "text" ? block.text.trim() : "";
	} catch (err) {
		throw new ExternalServiceError(
			"Claude",
			"Failed to analyze response.",
			502,
			{ responseLength },
			err,
		);
	}
}

// `response_format: json_object` only guarantees parseable JSON, never our schema,
// and the analysis model does drift — one observed slip returned `risks` as a bare
// array instead of `{ items: [...] }`. That output used to be cast straight to
// BrandAnalysisResult and stored, so every consumer walking `risks.items` crashed.
// Each section is coerced here with a zero-value fallback instead: a partially
// repaired analysis is still usable, whereas rejecting it discards the scraped
// response entirely.
function withFallback<Schema extends z.ZodTypeAny>(
	schema: Schema,
	fallback: z.output<Schema>,
	field: string,
) {
	return schema.catch((ctx: { error: z.ZodError; input: unknown }) => {
		logger.warn(
			`analysis section "${field}" malformed — using fallback (${
				ctx.error.issues[0]?.message ?? "unknown issue"
			})`,
		);
		return fallback;
	});
}

const RECOMMENDATION_TYPES = [
	"top_pick",
	"strong_alternative",
	"conditional",
	"mentioned_only",
	"discouraged",
	"not_mentioned",
] as const;

const PRICING_PERCEPTIONS = [
	"premium",
	"mid_range",
	"budget",
	"free",
	"not_mentioned",
] as const;

const competitorSchema = z.object({
	name: z.string().catch(""),
	// The prompt allows a null domain. The dashboard already collapses that to ""
	// downstream, so normalize at the boundary to match the declared string type.
	domain: z
		.string()
		.nullable()
		.catch(null)
		.transform((value) => value ?? ""),
	visibility: z.number().catch(0),
	sentiment: z.number().catch(0),
	rankPosition: z.number().nullable().catch(null),
	isRecommended: z.boolean().catch(false),
});

const brandAnalysisSchema = z.object({
	geoScore: withFallback(
		z.object({ overall: z.number().catch(0) }),
		{ overall: 0 },
		"geoScore",
	),
	presence: withFallback(
		z.object({
			mentioned: z.boolean().catch(false),
			visibility: z.number().catch(0),
		}),
		{ mentioned: false, visibility: 0 },
		"presence",
	),
	position: withFallback(
		z.object({ rankPosition: z.number().nullable().catch(null) }),
		{ rankPosition: null },
		"position",
	),
	sentiment: withFallback(
		z.object({ score: z.number().catch(0) }),
		{ score: 0 },
		"sentiment",
	),
	recommendation: withFallback(
		z.object({ type: z.enum(RECOMMENDATION_TYPES).catch("not_mentioned") }),
		{ type: "not_mentioned" },
		"recommendation",
	),
	competitors: withFallback(
		z
			.array(competitorSchema)
			// Drop entries the model left unnamed rather than discarding the whole list.
			.transform((list) => list.filter((c) => c.name.length > 0)),
		[],
		"competitors",
	),
	perception: withFallback(
		z.object({
			coreClaims: z.array(z.string()).catch([]),
			differentiators: z.array(z.string()).catch([]),
			bestKnownFor: z.string().nullable().catch(null),
			pricingPerception: z.enum(PRICING_PERCEPTIONS).catch("not_mentioned"),
		}),
		{
			coreClaims: [],
			differentiators: [],
			bestKnownFor: null,
			pricingPerception: "not_mentioned",
		},
		"perception",
	),
	risks: withFallback(
		z.preprocess(
			// Observed drift: `risks` arrives as the items array itself.
			(value) => (Array.isArray(value) ? { items: value } : value),
			z.object({
				items: z
					.array(
						z.object({
							severity: z.enum(["critical", "warning", "info"]).catch("info"),
						}),
					)
					.catch([]),
			}),
		),
		{ items: [] },
		"risks",
	),
});

export async function runAnalysis(
	input: AnalysisInputSingle,
): Promise<BrandAnalysisResult> {
	const prompt = analysisPrompt(input);

	const text =
		env.ANALYSIS_LLM_PROVIDER === "claude"
			? await runWithClaude(prompt, input.response.length)
			: await runWithOpenAI(prompt, input.response.length);

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch (err) {
		throw new ValidationError(
			"Invalid JSON returned from LLM during analysis.",
			{ rawOutput: text.slice(0, 200) },
		);
	}

	if (typeof parsed !== "object" || parsed === null) {
		throw new ValidationError("Invalid JSON shape", { type: typeof parsed });
	}

	return brandAnalysisSchema.parse(parsed);
}
