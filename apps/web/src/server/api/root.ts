import "server-only";

import { createTRPCRouter } from "@/server/api/trpc";
import { adminRouter } from "./routers/admin";
import { agentRouter } from "./routers/agent";
import { analysisRouter } from "./routers/analysis";
import { deviceRouter } from "./routers/device";
import { internalRouter } from "./routers/internal";
import { promptRouter } from "./routers/prompt";
import { reportRouter } from "./routers/report";
import { workspaceRouter } from "./routers/workspace";

export const appRouter = createTRPCRouter({
	admin: adminRouter,
	workspace: workspaceRouter,
	prompt: promptRouter,
	analysis: analysisRouter,
	agent: agentRouter,
	report: reportRouter,
	internal: internalRouter,
	device: deviceRouter,
});

export type AppRouter = typeof appRouter;
