import "server-only";

import { schema } from "@oneglanse/db";
import { AuthError } from "@oneglanse/errors";
import { eq } from "drizzle-orm";
import { t } from "../trpc";

export const isAuthenticated = t.middleware(async ({ next, ctx }) => {
	if (!ctx.session?.user) {
		throw new AuthError("User Id is undefined.");
	}
	const account = await ctx.db.query.user.findFirst({
		where: eq(schema.user.id, ctx.session.user.id),
	});
	if (account?.role !== "admin") {
		throw new AuthError("仅管理员账号可以访问。");
	}
	return next({
		ctx: {
			user: ctx.session.user,
		},
	});
});
