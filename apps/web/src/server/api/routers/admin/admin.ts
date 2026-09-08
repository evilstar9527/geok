import "server-only";

import { protectedProcedure } from "@/server/api/procedures";
import { createTRPCRouter } from "@/server/api/trpc";
import { schema } from "@oneglanse/db";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull } from "drizzle-orm";

export const adminRouter = createTRPCRouter({
	listAccounts: protectedProcedure.query(async ({ ctx }) => {
		const currentUser = await ctx.db.query.user.findFirst({
			where: eq(schema.user.id, ctx.user.id),
		});
		if (currentUser?.role !== "admin") {
			throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员可以访问" });
		}

		const rows = await ctx.db
			.select({
				id: schema.user.id,
				account: schema.user.username,
				email: schema.user.email,
				role: schema.user.role,
				createdAt: schema.user.createdAt,
				workspaceId: schema.workspaces.id,
				brandName: schema.workspaces.name,
			})
			.from(schema.user)
			.leftJoin(
				schema.workspaceMembers,
				and(
					eq(schema.workspaceMembers.userId, schema.user.id),
					isNull(schema.workspaceMembers.deletedAt),
				),
			)
			.leftJoin(
				schema.workspaces,
				and(
					eq(schema.workspaces.id, schema.workspaceMembers.workspaceId),
					isNull(schema.workspaces.deletedAt),
				),
			)
			.orderBy(asc(schema.user.createdAt));

		const accounts = new Map<
			string,
			{
				id: string;
				account: string;
				role: string;
				createdAt: Date;
				brands: { id: string; name: string }[];
			}
		>();
		for (const row of rows) {
			const item = accounts.get(row.id) ?? {
				id: row.id,
				account: row.account ?? row.email.replace(/@geo\.local$/, ""),
				role: row.role,
				createdAt: row.createdAt,
				brands: [],
			};
			if (
				row.workspaceId &&
				row.brandName &&
				!item.brands.some((brand) => brand.id === row.workspaceId)
			) {
				item.brands.push({ id: row.workspaceId, name: row.brandName });
			}
			accounts.set(row.id, item);
		}

		return Array.from(accounts.values());
	}),
});
