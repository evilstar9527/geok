import "server-only";

import { AuthError } from "@oneglanse/errors";
import {
	createDeviceConnection,
	deleteDeviceConnection,
	listDeviceConnections,
	requestDeviceControl,
	updateDeviceConnection,
} from "@oneglanse/services";
import { MOBILE_PROVIDER_LIST } from "@oneglanse/types";
import { z } from "zod";
import { authorizedWorkspaceProcedure } from "../../procedures";
import { createTRPCRouter } from "../../trpc";

const providerList = z.array(z.enum(MOBILE_PROVIDER_LIST)).min(1);
const headers = z.record(z.string(), z.string()).optional();
const capabilities = z.record(z.string(), z.unknown()).optional();

function assertOwner(role: string) {
	if (role !== "owner")
		throw new AuthError("Only workspace owners can manage devices.");
}

export const deviceRouter = createTRPCRouter({
	list: authorizedWorkspaceProcedure.query(({ ctx }) =>
		listDeviceConnections(ctx.workspaceId),
	),

	discoverLocal: authorizedWorkspaceProcedure.mutation(async ({ ctx }) => {
		assertOwner(ctx.membership.role);
		const result = await requestDeviceControl({
			action: "discover",
			workspaceId: ctx.workspaceId,
		});
		return result.action === "discover" ? result.devices : [];
	}),

	create: authorizedWorkspaceProcedure
		.input(
			z.object({
				name: z.string().min(1).max(128),
				kind: z.enum(["local_adb", "remote_appium"]),
				serial: z.string().min(1).max(256),
				appiumUrl: z.string().url().max(2048),
				supportedProviders: providerList,
				headers,
				capabilities,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertOwner(ctx.membership.role);
			return createDeviceConnection({
				workspaceId: ctx.workspaceId,
				createdBy: ctx.user.id,
				name: input.name,
				kind: input.kind,
				serial: input.serial,
				appiumUrl: input.appiumUrl,
				supportedProviders: input.supportedProviders,
				secret: {
					appiumUrl: input.appiumUrl,
					headers: input.headers,
					capabilities: input.capabilities,
				},
			});
		}),

	update: authorizedWorkspaceProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				name: z.string().min(1).max(128).optional(),
				enabled: z.boolean().optional(),
				supportedProviders: providerList.optional(),
				appiumUrl: z.string().url().max(2048).optional(),
				headers,
				capabilities,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertOwner(ctx.membership.role);
			return updateDeviceConnection({
				id: input.id,
				workspaceId: ctx.workspaceId,
				name: input.name,
				enabled: input.enabled,
				supportedProviders: input.supportedProviders,
				secret: input.appiumUrl
					? {
							appiumUrl: input.appiumUrl,
							headers: input.headers,
							capabilities: input.capabilities,
						}
					: undefined,
			});
		}),

	test: authorizedWorkspaceProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			assertOwner(ctx.membership.role);
			const result = await requestDeviceControl({
				action: "test",
				workspaceId: ctx.workspaceId,
				deviceId: input.id,
			});
			return result.action === "test" ? result.diagnostic : null;
		}),

	delete: authorizedWorkspaceProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			assertOwner(ctx.membership.role);
			await deleteDeviceConnection({
				id: input.id,
				workspaceId: ctx.workspaceId,
			});
			return { success: true };
		}),
});
