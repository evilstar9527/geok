import { cancelProviderRun, redis, waitForRedis } from "@oneglanse/services";
import { PROVIDER_LIST } from "@oneglanse/types";
import { z } from "zod";
import { createRateLimiter } from "../../middleware/rateLimit";
import { validWorkspace } from "../../middleware/validWorkspace";
import {
	authorizedWorkspaceProcedure,
	protectedProcedure,
} from "../../procedures";
import { createTRPCRouter } from "../../trpc";
import { submitAgentRun } from "../_shared/submitAgentRun";

export const agentRouter = createTRPCRouter({
	run: authorizedWorkspaceProcedure
		.use(createRateLimiter("agent.run", { limit: 3, windowSecs: 60 }))
		.mutation(async ({ ctx }) => {
			const {
				user: { id: userId },
				workspaceId,
			} = ctx;

			return submitAgentRun({ workspaceId, userId });
		}),

	status: authorizedWorkspaceProcedure
		.input(z.object({ jobId: z.string() }))
		.output(
			z.object({
				status: z.enum(["pending", "completed", "missing"]),
				response: z.unknown(),
			}),
		)
		.query(async ({ input }) => {
			await waitForRedis();
			const result = await redis.get(`job:${input.jobId}:result`);

			// 进度 key 不存在 = 这个 run 已经没了(worker 重启 drain 队列、TTL 过期、
			// 或 jobId 本身无效)。以前这里返回 "pending",前端会把它当成「还在排队」
			// 无限轮询下去 —— toast 永远停在最后收到的进度不消失。
			if (!result) {
				return { status: "missing" as const, response: null };
			}

			const parsed = JSON.parse(result);
			return {
				status: parsed?.status === "completed" ? "completed" : "pending",
				response: parsed,
			};
		}),

	stopProvider: protectedProcedure
		.input(
			z.object({
				workspaceId: z.string(),
				jobId: z.string(),
				provider: z.enum(PROVIDER_LIST),
			}),
		)
		.use(validWorkspace)
		.mutation(async ({ input }) => {
			return cancelProviderRun({
				jobGroupId: input.jobId,
				provider: input.provider,
			});
		}),
});
