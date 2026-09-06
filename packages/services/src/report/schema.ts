import { z } from "zod";

export const reportMentionEntrySchema = z.object({
	name: z.string().min(1),
	domain: z.string().nullable(),
	mentionRate: z.number().min(0).max(100),
	appearances: z.number().int().min(0),
	isBrand: z.boolean(),
});

export const reportGapSchema = z.object({
	key: z.enum(["mention", "recommendation", "rank", "sentiment", "risk"]),
	brandValue: z.number().nullable(),
	competitorValue: z.number().nullable(),
	competitorName: z.string(),
	times: z.number().nullable(),
});

export const reportDataSchema = z.object({
	version: z.literal(1),
	brand: z.object({
		name: z.string().min(1),
		domain: z.string().nullable(),
	}),
	generatedAt: z.string().min(1),
	totalResponses: z.number().int().min(0),
	mentionRates: z.array(reportMentionEntrySchema).min(1),
	gaps: z.array(reportGapSchema),
});
