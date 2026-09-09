import { AuthError, ValidationError } from "@oneglanse/errors";
import {
	addMemberToWorkspaceByEmail,
	getLastPromptRunTime,
	getWorkspaceById,
	getWorkspaceJoinInfo,
	getWorkspaceMembersWithUsers,
	removeMemberFromWorkspace,
	updateOrganizationName,
	updateWorkspaceDetails,
	updateWorkspaceEnabledProviders,
	updateWorkspaceExposureTerms,
	updateWorkspaceSchedule,
	updateWorkspaceScheduledSurfaces,
	updateWorkspaceSelectedPrompts,
} from "@oneglanse/services";
import {
	administratorWorkspaceProcedure,
	authorizedWorkspaceProcedure,
} from "../../../procedures";
import { parseCronExpressionOrThrow } from "../_helpers/scheduling";
import {
	addMemberInputSchema,
	removeMemberInputSchema,
	setEnabledProvidersInputSchema,
	setExposureTermsInputSchema,
	setScheduleInputSchema,
	setScheduledSurfacesInputSchema,
	setSelectedPromptsInputSchema,
	updateDetailsInputSchema,
	updateOrganizationNameInputSchema,
} from "../_schemas";

export const authorizedWorkspaceRoutes = {
	getById: authorizedWorkspaceProcedure.query(async ({ ctx }) => {
		return getWorkspaceById({ workspaceId: ctx.workspaceId });
	}),

	listMembers: administratorWorkspaceProcedure.query(async ({ ctx }) => {
		return getWorkspaceMembersWithUsers({ workspaceId: ctx.workspaceId });
	}),

	updateDetails: administratorWorkspaceProcedure
		.input(updateDetailsInputSchema)
		.mutation(async ({ input, ctx }) => {
			if (ctx.membership.role !== "owner") {
				throw new ValidationError(
					"Only workspace owners can update workspace details.",
				);
			}
			return updateWorkspaceDetails({
				workspaceId: input.workspaceId,
				name: input.name,
				domain: input.domain,
			});
		}),

	updateOrganizationName: administratorWorkspaceProcedure
		.input(updateOrganizationNameInputSchema)
		.mutation(async ({ input, ctx }) => {
			if (ctx.membership.role !== "owner") {
				throw new ValidationError(
					"Only workspace owners can rename the organization.",
				);
			}
			return updateOrganizationName({
				workspaceId: input.workspaceId,
				organizationName: input.organizationName,
			});
		}),

	getJoinInfo: administratorWorkspaceProcedure.query(async ({ ctx }) => {
		return getWorkspaceJoinInfo({ workspaceId: ctx.workspaceId });
	}),

	addMember: administratorWorkspaceProcedure
		.input(addMemberInputSchema)
		.mutation(async ({ input, ctx }) => {
			return addMemberToWorkspaceByEmail({
				workspaceId: ctx.workspaceId,
				email: input.email,
				role: input.role,
			});
		}),

	removeMember: administratorWorkspaceProcedure
		.input(removeMemberInputSchema)
		.mutation(async ({ input, ctx }) => {
			const { workspaceId, user, membership } = ctx;
			const { userId } = input;

			if (membership.role !== "owner") {
				throw new AuthError("Only workspace owners can remove members.");
			}
			if (userId === user.id) {
				throw new ValidationError("You cannot remove yourself.");
			}

			return removeMemberFromWorkspace({ workspaceId, userId });
		}),

	getSchedule: administratorWorkspaceProcedure.query(async ({ ctx }) => {
		const workspace = await getWorkspaceById({ workspaceId: ctx.workspaceId });
		return {
			schedule: workspace.schedule ?? null,
			runCount: workspace.runCount,
		};
	}),

	getEnabledProviders: administratorWorkspaceProcedure.query(
		async ({ ctx }) => {
			const workspace = await getWorkspaceById({
				workspaceId: ctx.workspaceId,
			});
			return { enabledProviders: workspace.enabledProviders ?? null };
		},
	),

	setSchedule: administratorWorkspaceProcedure
		.input(setScheduleInputSchema)
		.mutation(async ({ ctx, input }) => {
			const { workspaceId } = ctx;
			const userId = ctx.user.id;
			const { schedule, runCount } = input;

			if (schedule) {
				parseCronExpressionOrThrow(schedule);
			}

			const result = await updateWorkspaceSchedule({
				workspaceId,
				userId,
				schedule,
				runCount,
			});

			return result;
		}),

	setEnabledProviders: administratorWorkspaceProcedure
		.input(setEnabledProvidersInputSchema)
		.mutation(async ({ ctx, input }) => {
			return updateWorkspaceEnabledProviders({
				workspaceId: ctx.workspaceId,
				enabledProviders: input.enabledProviders,
			});
		}),

	getSelectedPrompts: administratorWorkspaceProcedure.query(async ({ ctx }) => {
		const workspace = await getWorkspaceById({ workspaceId: ctx.workspaceId });
		return { selectedPromptIds: workspace.selectedPromptIds ?? null };
	}),

	setSelectedPrompts: administratorWorkspaceProcedure
		.input(setSelectedPromptsInputSchema)
		.mutation(async ({ ctx, input }) => {
			return updateWorkspaceSelectedPrompts({
				workspaceId: ctx.workspaceId,
				selectedPromptIds: input.selectedPromptIds,
			});
		}),

	getExposureSettings: administratorWorkspaceProcedure.query(
		async ({ ctx }) => {
			const workspace = await getWorkspaceById({
				workspaceId: ctx.workspaceId,
			});
			return {
				exposureTerms: workspace.exposureTerms,
				scheduledSurfaces: workspace.scheduledExecutionSurfaces,
			};
		},
	),

	setExposureTerms: administratorWorkspaceProcedure
		.input(setExposureTermsInputSchema)
		.mutation(async ({ ctx, input }) => {
			if (ctx.membership.role !== "owner") {
				throw new ValidationError(
					"Only workspace owners can update exposure terms.",
				);
			}
			return updateWorkspaceExposureTerms({
				workspaceId: ctx.workspaceId,
				exposureTerms: input.exposureTerms,
			});
		}),

	setScheduledSurfaces: administratorWorkspaceProcedure
		.input(setScheduledSurfacesInputSchema)
		.mutation(async ({ ctx, input }) => {
			if (ctx.membership.role !== "owner") {
				throw new ValidationError(
					"Only workspace owners can update scheduled execution targets.",
				);
			}
			return updateWorkspaceScheduledSurfaces({
				workspaceId: ctx.workspaceId,
				surfaces: input.surfaces,
			});
		}),

	getCronTiming: administratorWorkspaceProcedure.query(async ({ ctx }) => {
		const { workspaceId } = ctx;
		const workspace = await getWorkspaceById({ workspaceId });
		const cronSchedule = workspace.schedule;

		let nextRun = null;
		if (cronSchedule) {
			try {
				const expression = parseCronExpressionOrThrow(cronSchedule);
				nextRun = expression.next().toDate().toISOString();
			} catch (err) {
				console.error("Error calculating next run:", err);
			}
		}

		let lastPromptRun = null;
		try {
			lastPromptRun = await getLastPromptRunTime({ workspaceId });
		} catch (err) {
			console.error("Error fetching last prompt run:", err);
		}

		return { nextRun, lastPromptRun };
	}),
};
