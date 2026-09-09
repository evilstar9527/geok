import "server-only";

import { schema } from "@oneglanse/db";
import { AuthError } from "@oneglanse/errors";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { t } from "../trpc";

export const isAdministrator = t.middleware(async ({ next, ctx }) => {
	const user = ctx.session?.user;
	if (!user) {
		throw new AuthError("User Id is undefined.");
	}

	const account = await ctx.db.query.user.findFirst({
		where: eq(schema.user.id, user.id),
		columns: { role: true },
	});
	if (account?.role !== "admin") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only the administrator can access this operation.",
		});
	}

	return next({ ctx: { ...ctx, user } });
});
