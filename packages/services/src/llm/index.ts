import Anthropic from "@anthropic-ai/sdk";
import { EnvError } from "@oneglanse/errors";
import ChatGptClient from "openai";
import { env } from "../env.js";

let openaiClient: ChatGptClient | null = null;
let anthropicClient: Anthropic | null = null;

function initOpenai(): ChatGptClient {
	if (openaiClient) return openaiClient;

	const isOpenRouter = Boolean(env.OPENROUTER_API_KEY);
	const apiKey = env.OPENROUTER_API_KEY ?? env.OPENAI_API_KEY;
	if (!apiKey) {
		throw new EnvError(
			"OPENROUTER_API_KEY",
			"Missing analysis API key. Set OPENROUTER_API_KEY or OPENAI_API_KEY in your environment.",
		);
	}

	openaiClient = new ChatGptClient({
		apiKey,
		...(isOpenRouter ? { baseURL: env.OPENROUTER_BASE_URL } : {}),
	});
	return openaiClient;
}

function initAnthropic(): Anthropic {
	if (anthropicClient) return anthropicClient;

	// Prefer a direct Anthropic key; otherwise fall back to the OpenRouter-style
	// relay, which serves Claude models on its own `/messages` endpoint (they are
	// rejected by its `/chat/completions`). Mirrors initOpenai's key switch.
	const apiKey = env.ANTHROPIC_API_KEY || env.OPENROUTER_API_KEY;
	if (!apiKey) {
		throw new EnvError(
			"ANTHROPIC_API_KEY",
			"Missing Anthropic API key. Set ANTHROPIC_API_KEY or OPENROUTER_API_KEY in your environment.",
		);
	}

	// The Anthropic SDK appends its own `/v1/messages`, so hand it the host root.
	// OPENROUTER_BASE_URL ends in `/v1` for the OpenAI-shaped client; leaving it
	// on would request `<host>/api/v1/v1/messages` and 404.
	const relayBaseUrl = env.OPENROUTER_BASE_URL.replace(/\/v1\/?$/, "");

	anthropicClient = new Anthropic({
		apiKey,
		...(env.ANTHROPIC_API_KEY ? {} : { baseURL: relayBaseUrl }),
	});
	return anthropicClient;
}

/**
 * Proxy defers client creation until first actual usage
 */
export const chatgpt = new Proxy({} as ChatGptClient, {
	get(_target, prop) {
		const instance = initOpenai();
		// @ts-expect-error – dynamic proxy passthrough
		return instance[prop];
	},
});

export function isOpenRouterConfigured(): boolean {
	return Boolean(env.OPENROUTER_API_KEY);
}

export const claude = new Proxy({} as Anthropic, {
	get(_target, prop) {
		const instance = initAnthropic();
		// @ts-expect-error – dynamic proxy passthrough
		return instance[prop];
	},
});

/**
 * Strips a markdown code fence from an LLM's JSON reply. The Anthropic API has
 * no `response_format: json_object` equivalent, so a model told to emit JSON
 * may still wrap it in ```json … ``` despite instructions not to.
 */
export function unfenceJson(text: string): string {
	const trimmed = text.trim();
	if (!trimmed.startsWith("```")) return trimmed;
	return trimmed
		.replace(/^```(?:json)?\s*\n?/i, "")
		.replace(/\n?```\s*$/, "")
		.trim();
}
