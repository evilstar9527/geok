import "server-only";

import { createTRPCRouter } from "@/server/api/trpc";
import { getWorkspaceById } from "@oneglanse/services";
import {
	EXECUTION_SURFACE_LIST,
	type ExecutionSurface,
} from "@oneglanse/types";
import { z } from "zod";
import { internalProcedure } from "../../procedures";
import { submitAgentRun } from "../_shared/submitAgentRun";

export const internalRouter = createTRPCRouter({
	runPrompts: internalProcedure
		.input(
			z.object({
				workspaceId: z.string(),
				userId: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const { workspaceId, userId } = input;
			const workspace = await getWorkspaceById({ workspaceId });
			const surfaces = workspace.scheduledExecutionSurfaces.filter(
				(surface): surface is ExecutionSurface =>
					(EXECUTION_SURFACE_LIST as readonly string[]).includes(surface),
			);
			return submitAgentRun({
				workspaceId,
				userId,
				surfaces: surfaces.length ? surfaces : ["web"],
				runCount: workspace.runCount,
			});
		}),
});
