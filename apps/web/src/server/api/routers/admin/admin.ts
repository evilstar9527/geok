import "server-only";

import {
	decryptManagedPassword,
	encryptManagedPassword,
} from "@/server/account-password";
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

const setAccountPasswordInput = z.object({
	userId: z.string().min(1),
	password: z.string().min(8, "密码至少需要 8 个字符").max(128),
});

const updateBrandInput = z.object({
	workspaceId: z.string().min(1),
	name: z
		.string()
		.trim()
		.min(2, "品牌名至少需要 2 个字符")
		.max(80, "品牌名最多 80 个字符"),
	domain: z
		.string()
		.trim()
		.max(256, "品牌域名最多 256 个字符")
		.refine((value) => value === "" || value.length >= 2, {
			message: "品牌域名至少需要 2 个字符",
		}),
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
				await ctx.db
					.update(schema.user)
					.set({ managedPassword: encryptManagedPassword(input.password) })
					.where(eq(schema.user.id, result.user.id));

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

	setAccountPassword: administratorProcedure
		.input(setAccountPasswordInput)
		.mutation(async ({ ctx, input }) => {
			const target = await ctx.db.query.user.findFirst({
				where: eq(schema.user.id, input.userId),
				columns: { id: true, role: true },
			});
			if (!target) {
				throw new TRPCError({ code: "NOT_FOUND", message: "账号不存在" });
			}
			if (target.role === "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "管理员密码不能在这里修改",
				});
			}

			await ctx.auth.api.setUserPassword({
				headers: ctx.headers,
				body: { userId: target.id, newPassword: input.password },
			});
			await ctx.db
				.update(schema.user)
				.set({ managedPassword: encryptManagedPassword(input.password) })
				.where(eq(schema.user.id, target.id));

			return { success: true };
		}),

	// Renames a brand in place. Unlike workspace.updateDetails this deliberately
	// keeps existing analysis rows — historical results stay visible under the
	// new name instead of being cleared.
	updateBrand: administratorProcedure
		.input(updateBrandInput)
		.mutation(async ({ ctx, input }) => {
			const [updated] = await ctx.db
				.update(schema.workspaces)
				.set({ name: input.name, domain: input.domain })
				.where(
					and(
						eq(schema.workspaces.id, input.workspaceId),
						isNull(schema.workspaces.deletedAt),
					),
				)
				.returning({
					id: schema.workspaces.id,
					name: schema.workspaces.name,
					domain: schema.workspaces.domain,
				});
			if (!updated) {
				throw new TRPCError({ code: "NOT_FOUND", message: "品牌不存在" });
			}

			return updated;
		}),

	listAccounts: administratorProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db
			.select({
				id: schema.user.id,
				account: schema.user.username,
				email: schema.user.email,
				role: schema.user.role,
				managedPassword: schema.user.managedPassword,
				createdAt: schema.user.createdAt,
				workspaceId: schema.workspaces.id,
				brandName: schema.workspaces.name,
				brandDomain: schema.workspaces.domain,
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
				password: string | null;
				createdAt: Date;
				brands: { id: string; name: string; domain: string }[];
			}
		>();
		for (const row of rows) {
			const item = accounts.get(row.id) ?? {
				id: row.id,
				account: row.account ?? row.email.replace(/@geo\.local$/, ""),
				role: row.role,
				password: row.managedPassword
					? decryptManagedPassword(row.managedPassword)
					: null,
				createdAt: row.createdAt,
				brands: [],
			};
			if (
				row.workspaceId &&
				row.brandName &&
				!item.brands.some((brand) => brand.id === row.workspaceId)
			) {
				item.brands.push({
					id: row.workspaceId,
					name: row.brandName,
					domain: row.brandDomain ?? "",
				});
			}
			accounts.set(row.id, item);
		}

		return Array.from(accounts.values());
	}),
});
