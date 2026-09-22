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

/**
 * Reads the assistant text out of whatever the OpenAI client handed back.
 *
 * The analysis relay answers `/chat/completions` with `text/event-stream` even
 * when the request does not ask for a stream, and the SDK only JSON-parses
 * `application/json` — an SSE body therefore arrives as the raw string, where
 * `response.choices` is undefined. Handling both shapes keeps the call working
 * whichever way the relay answers.
 */
export function completionText(response: unknown): string {
	if (typeof response === "string") return streamedCompletionText(response);
	const content = (
		response as { choices?: Array<{ message?: { content?: string } }> }
	).choices?.[0]?.message?.content;
	return content?.trim() || "";
}

function streamedCompletionText(body: string): string {
	let text = "";
	for (const line of body.split("\n")) {
		if (!line.startsWith("data:")) continue;
		const frame = line.slice("data:".length).trim();
		if (!frame || frame === "[DONE]") continue;
		const chunk = JSON.parse(frame) as {
			choices?: Array<{ delta?: { content?: string } }>;
		};
		text += chunk.choices?.[0]?.delta?.content ?? "";
	}
	return text.trim();
}

async function runWithOpenAI(
	prompt: string,
	responseLength: number,
): Promise<string> {
	try {
		if (isOpenRouterConfigured()) {
			const response = await chatgpt.chat.completions.create({
				// The relay serves gpt-5.6-sol and reports it as itself; the previous
				// OpenRouter-style default (`openai/gpt-4.1-mini`) now answers 400
				// "模型配置不存在". Set ANALYSIS_MODEL for any other provider.
				model: env.ANALYSIS_MODEL || "gpt-5.6-sol",
				temperature: 0,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: prompt },
				],
				response_format: { type: "json_object" },
			});
			return completionText(response);
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
			`Failed to analyze response: ${err instanceof Error ? err.message : String(err)}`,
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
			// Mirrors the two OpenAI branches above. This was hardcoded, so setting
			// ANALYSIS_MODEL to a Claude model had no effect on the Claude path.
			model: env.ANALYSIS_MODEL || "claude-sonnet-4-6",
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
			`Failed to analyze response: ${err instanceof Error ? err.message : String(err)}`,
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

/**
 * Returns the first balanced `{...}` in the text, ignoring braces inside strings.
 * Used only as a recovery path when the whole text is not parseable.
 */
export function firstJsonObject(text: string): string | null {
	const start = text.indexOf("{");
	if (start === -1) return null;

	let depth = 0;
	let inString = false;
	for (let i = start; i < text.length; i++) {
		const char = text[i];
		if (inString) {
			if (char === "\\") i++;
			else if (char === '"') inString = false;
			continue;
		}
		if (char === '"') inString = true;
		else if (char === "{") depth++;
		else if (char === "}" && --depth === 0) return text.slice(start, i + 1);
	}
	return null;
}

/**
 * The analysis model trails a complete object with an ellipsis or a sentence of
 * commentary often enough that a plain JSON.parse discards usable analyses —
 * observed as `{…"risks":{"items":[]}}...` from the analysis model. Fall back to
 * the first balanced object, the same way `unfenceJson()` tolerates the Claude
 * paths' code fences.
 */
export function parseAnalysisJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		const object = firstJsonObject(text);
		if (object === null) throw new SyntaxError("no JSON object found");
		return JSON.parse(object);
	}
}

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
		parsed = parseAnalysisJson(text);
	} catch {
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
