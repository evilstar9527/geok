import "server-only";

import { administratorProcedure } from "@/server/api/procedures";
import { createTRPCRouter } from "@/server/api/trpc";
import { schema } from "@oneglanse/db";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";

const createAccountInput = z.object({
	account: z
		.string()
		.trim()
		.min(3, "账号至少需要 3 个字符")
		.max(32, "账号最多 32 个字符")
		.regex(/^[a-zA-Z0-9_.-]+$/, "账号只能包含字母、数字、点、下划线或短横线"),
	password: z.string().min(8, "密码至少需要 8 个字符").max(128),
	brandName: z.string().trim().min(2, "品牌名至少需要 2 个字符").max(80),
});

export const adminRouter = createTRPCRouter({
	createAccount: administratorProcedure
		.input(createAccountInput)
		.mutation(async ({ ctx, input }) => {
			const account = input.account.toLowerCase();
			const emailKey = Buffer.from(account, "utf8").toString("base64url");
			const email = `geo-${emailKey}@geo.local`;
			const existing = await ctx.db.query.user.findFirst({
				where: or(
					eq(schema.user.username, account),
					eq(schema.user.email, email),
				),
				columns: { id: true },
			});
			if (existing) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "该账号已经存在，请更换账号",
				});
			}

			try {
				const result = await ctx.auth.api.createUser({
					headers: ctx.headers,
					body: {
						email,
						password: input.password,
						name: input.brandName,
						role: "user",
						data: {
							username: account,
							displayUsername: account,
						},
					},
				});

				return { id: result.user.id, account };
			} catch (error) {
				if (error instanceof TRPCError) throw error;
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "创建账号失败，请稍后重试",
					cause: error,
				});
			}
		}),

	listAccounts: administratorProcedure.query(async ({ ctx }) => {
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
