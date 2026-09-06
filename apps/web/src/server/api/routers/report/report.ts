import "server-only";

import { createTRPCRouter } from "@/server/api/trpc";
import { createReport, reportDataSchema } from "@oneglanse/services";
import { z } from "zod";
import { authorizedWorkspaceProcedure } from "../../procedures";

export const reportRouter = createTRPCRouter({
	create: authorizedWorkspaceProcedure
		.input(
			z.object({
				brandName: z.string().min(1),
				brandDomain: z.string().nullable(),
				data: reportDataSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { id } = await createReport({
				workspaceId: ctx.workspaceId,
				brandName: input.brandName,
				brandDomain: input.brandDomain,
				data: input.data,
			});

			return { id };
		}),
});
