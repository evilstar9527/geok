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
	// Optional so reports stored before these fields still validate.
	direction: z.enum(["ahead", "tied", "behind", "neutral"]).optional(),
	headline: z.string().optional(),
	insight: z.string().optional(),
});

const reportBrandPerceptionSchema = z.object({
	bestKnownFor: z.string().nullable(),
	pricingPerception: z.string(),
	coreClaims: z.array(z.string()),
	differentiators: z.array(z.string()),
});

const reportSourceEntrySchema = z.object({
	domain: z.string().min(1),
	favicon: z.string().nullable(),
	citationCount: z.number().int().min(0),
	models: z.array(z.string()),
});

const reportModelEntrySchema = z.object({
	model: z.string().min(1),
	responseCount: z.number().int().min(0),
	mentionRate: z.number().min(0).max(100),
	recommendationRate: z.number().min(0).max(100),
});

const reportRecommendationSchema = z.object({
	priority: z.enum(["high", "medium", "low"]),
	title: z.string().min(1),
	rationale: z.string(),
	action: z.string(),
	kpi: z.string(),
});

export const reportDataSchema = z.object({
	version: z.union([z.literal(1), z.literal(2)]),
	brand: z.object({
		name: z.string().min(1),
		domain: z.string().nullable(),
	}),
	generatedAt: z.string().min(1),
	totalResponses: z.number().int().min(0),
	mentionRates: z.array(reportMentionEntrySchema).min(1),
	gaps: z.array(reportGapSchema),
	brandPerception: reportBrandPerceptionSchema.optional(),
	sourcesIntelligence: z.array(reportSourceEntrySchema).optional(),
	perModelVisibility: z.array(reportModelEntrySchema).optional(),
	recommendations: z.array(reportRecommendationSchema).optional(),
});
