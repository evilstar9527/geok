import "server-only";

import { createTRPCRouter } from "@/server/api/trpc";
import {
	analysePromptsForWorkspace,
	fetchAnalysedPrompts,
} from "@oneglanse/services";
import { z } from "zod";
import { createRateLimiter } from "../../middleware/rateLimit";
import {
	administratorWorkspaceProcedure,
	authorizedWorkspaceProcedure,
} from "../../procedures";

export const analysisRouter = createTRPCRouter({
	analyzeMetrics: administratorWorkspaceProcedure
		.input(
			z.object({
				analyzeAll: z.boolean().optional().default(true),
			}),
		)
		.use(
			createRateLimiter("analysis.analyzeMetrics", {
				limit: 10,
				windowSecs: 60,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return analysePromptsForWorkspace({
				workspaceId: ctx.workspaceId,
				analyzeAll: input.analyzeAll ?? true,
			});
		}),

	fetchAnalysis: authorizedWorkspaceProcedure
		.input(z.object({ includeResponse: z.boolean().optional().default(true) }))
		.query(async ({ ctx, input }) => {
			return fetchAnalysedPrompts({
				workspaceId: ctx.workspaceId,
				includeResponse: input.includeResponse,
			});
		}),
});
