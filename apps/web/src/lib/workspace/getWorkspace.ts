import "server-only";

import { auth } from "@lib/auth/auth";
import { db, schema } from "@oneglanse/db";
import type { Workspace } from "@oneglanse/db";
import { inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";

export async function getWorkspace(): Promise<Workspace | null> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) return null;

	const sessionWithOrg = session.session as typeof session.session & {
		activeOrganizationId?: string | null;
	};

	const orgId = sessionWithOrg.activeOrganizationId ?? null;

	if (orgId) {
		const workspace = await db.query.workspaces.findFirst({
			where: (table, { and, eq, isNull }) =>
				and(eq(table.tenantId, orgId), isNull(table.deletedAt)),
			orderBy: (table, { desc }) => [desc(table.createdAt)],
		});

		if (workspace) return workspace;
	}

	const memberships = await db.query.workspaceMembers.findMany({
		where: (wm, { and, eq, isNull }) =>
			and(eq(wm.userId, session.user.id), isNull(wm.deletedAt)),
		columns: {
			workspaceId: true,
		},
	});

	const workspaceIds = Array.from(
		new Set(
			memberships
				.map((membership) => membership.workspaceId)
				.filter((workspaceId): workspaceId is string => Boolean(workspaceId)),
		),
	);

	if (workspaceIds.length === 0) {
		// Workspace is only an internal data boundary. Brand records are created
		// automatically so users never need to join or create a workspace.
		return db.transaction(async (tx) => {
			await tx.execute(
				sql`select pg_advisory_xact_lock(hashtext(${session.user.id}))`,
			);

			const existingMembership = await tx.query.workspaceMembers.findFirst({
				where: (wm, { and, eq, isNull }) =>
					and(eq(wm.userId, session.user.id), isNull(wm.deletedAt)),
			});
			if (existingMembership) {
				return (
					(await tx.query.workspaces.findFirst({
						where: (table, { and, eq, isNull }) =>
							and(
								eq(table.id, existingMembership.workspaceId),
								isNull(table.deletedAt),
							),
					})) ?? null
				);
			}

			const createdAt = new Date();
			const suffix = crypto.randomUUID().slice(0, 8);
			const brandName = session.user.name.trim() || session.user.username || "品牌";
			const slugBase =
				brandName
					.toLowerCase()
					.replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
					.replace(/^-+|-+$/g, "") || "brand";
			const organizationId = `org_${crypto.randomUUID()}`;
			const workspaceId = `workspace_${crypto.randomUUID()}`;
			const slug = `${slugBase}-${suffix}`;

			await tx.insert(schema.organization).values({
				id: organizationId,
				name: brandName,
				slug,
				createdAt,
			});
			await tx.insert(schema.member).values({
				id: `member_${crypto.randomUUID()}`,
				organizationId,
				userId: session.user.id,
				role: "owner",
				createdAt,
			});
			const [workspace] = await tx
				.insert(schema.workspaces)
				.values({
					id: workspaceId,
					name: brandName,
					slug,
					domain: "",
					tenantId: organizationId,
					createdAt,
				})
				.returning();
			await tx.insert(schema.workspaceMembers).values({
				workspaceId,
				userId: session.user.id,
				role: "owner",
				createdAt,
			});

			return workspace ?? null;
		});
	}

	const workspace = await db.query.workspaces.findFirst({
		where: (table, { and, isNull }) =>
			and(inArray(table.id, workspaceIds), isNull(table.deletedAt)),
		orderBy: (table, { desc }) => [desc(table.createdAt)],
	});

	return workspace ?? null;
}
