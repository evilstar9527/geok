import { z } from "zod";

const asNumber = (fallback: number) =>
	z.preprocess((value) => {
		if (typeof value === "number") return value;
		if (typeof value !== "string") return fallback;
		const trimmed = value.trim();
		if (!trimmed) return fallback;
		const parsed = Number(trimmed);
		return Number.isFinite(parsed) ? parsed : fallback;
	}, z.number());

const ServicesEnvSchema = z.object({
	REDIS_HOST: z.string().trim().default("redis"),
	REDIS_PORT: asNumber(6379).default(6379),
	REDIS_PASSWORD: z.string().optional(),
	API_BASE_URL: z.string().url().optional(),
	INTERNAL_CRON_SECRET: z.string().optional(),
	OPENAI_API_KEY: z.string().optional(),
	OPENROUTER_API_KEY: z.string().optional(),
	OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
	ANALYSIS_MODEL: z.string().trim().optional(),
	ANTHROPIC_API_KEY: z.string().optional(),
	ANALYSIS_LLM_PROVIDER: z.enum(["openai", "claude"]).default("openai"),
	DEVICE_CONFIG_ENCRYPTION_KEY: z.preprocess(
		(value) => (typeof value === "string" && !value.trim() ? undefined : value),
		z.string().min(16).optional(),
	),
	ANDROID_DEVICE_AUTOMATION_ENABLED: z
		.enum(["true", "false", "1", "0"])
		.optional(),
});

export const env = ServicesEnvSchema.parse(process.env);
