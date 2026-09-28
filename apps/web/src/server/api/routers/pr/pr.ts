import "server-only";

import { createTRPCRouter } from "@/server/api/trpc";
import {
	createPrArticle,
	deletePrArticle,
	getPrArticleById,
	listPrArticles,
} from "@oneglanse/services";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { administratorWorkspaceProcedure } from "../../procedures";

/**
 * Every procedure here is administrator-only: a draft is outward-facing copy
 * written in the brand's voice from that brand's monitoring data, so ordinary
 * members do not get to read or produce it.
 */
export const prRouter = createTRPCRouter({
	generate: administratorWorkspaceProcedure
		.input(z.object({ promptId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			return createPrArticle({
				workspaceId: ctx.workspaceId,
				promptId: input.promptId,
				createdBy: ctx.user.id,
			});
		}),

	list: administratorWorkspaceProcedure.query(async ({ ctx }) => {
		return listPrArticles({ workspaceId: ctx.workspaceId });
	}),

	get: administratorWorkspaceProcedure
		.input(z.object({ id: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const article = await getPrArticleById({
				workspaceId: ctx.workspaceId,
				id: input.id,
			});
			if (!article) {
				throw new TRPCError({ code: "NOT_FOUND", message: "PR 稿不存在" });
			}
			return article;
		}),

	remove: administratorWorkspaceProcedure
		.input(z.object({ id: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const deleted = await deletePrArticle({
				workspaceId: ctx.workspaceId,
				id: input.id,
			});
			if (!deleted) {
				throw new TRPCError({ code: "NOT_FOUND", message: "PR 稿不存在" });
			}
			return { success: true };
		}),
});
