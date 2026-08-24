import { ExternalServiceError, ValidationError } from "@oneglanse/errors";
import type {
	AnalysisInputSingle,
	BrandAnalysisResult,
} from "@oneglanse/types";
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

	return parsed as BrandAnalysisResult;
}
