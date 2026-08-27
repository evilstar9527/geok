import "server-only";

import { createTRPCRouter } from "@/server/api/trpc";
import {
	fetchPromptSourcesForWorkspace,
	fetchUserPromptsForWorkspace,
	storePromptsForWorkspace,
} from "@oneglanse/services";
import { PROVIDER_LIST } from "@oneglanse/types";
import { z } from "zod";
import { createRateLimiter } from "../../middleware/rateLimit";
import { authorizedWorkspaceProcedure } from "../../procedures";

export const promptRouter = createTRPCRouter({
	store: authorizedWorkspaceProcedure
		.input(
			z.object({
				prompts: z.array(z.string().trim().min(1)),
			}),
		)
		.use(createRateLimiter("prompt.store", { limit: 20, windowSecs: 60 }))
		.mutation(async ({ input, ctx }) => {
			const { prompts } = input;

			const {
				user: { id: userId },
				workspaceId,
			} = ctx;

			return storePromptsForWorkspace({
				prompts: prompts,
				workspaceId: workspaceId,
				userId: userId,
			});
		}),

	fetchPromptSources: authorizedWorkspaceProcedure
		.input(
			z.object({
				startAt: z.string().datetime().optional(),
				endAt: z.string().datetime().optional(),
				modelProvider: z.enum(PROVIDER_LIST).optional(),
				promptId: z.string().min(1).optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { workspaceId } = ctx;

			return fetchPromptSourcesForWorkspace({
				workspaceId,
				startAt: input.startAt,
				endAt: input.endAt,
				modelProvider: input.modelProvider,
				promptId: input.promptId,
			});
		}),

	fetchUserPrompts: authorizedWorkspaceProcedure.query(async ({ ctx }) => {
		const { workspaceId } = ctx;

		return fetchUserPromptsForWorkspace({
			workspaceId,
		});
	}),
});
