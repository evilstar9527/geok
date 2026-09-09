import { env } from "@/env";
import { trackUserSignup } from "@/lib/telemetry";
import { db, schema } from "@oneglanse/db";
import * as authSchema from "@oneglanse/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization, username } from "better-auth/plugins";
import { asc, eq } from "drizzle-orm";
import { getActiveOrganization } from "../workspace/getActiveOrganization";

const isBuildTime =
	process.env.SKIP_ENV_VALIDATION === "true" ||
	process.env.npm_lifecycle_event === "build" ||
	(process.argv.includes("next") && process.argv.includes("build"));

const authSecret =
	env.BETTER_AUTH_SECRET ??
	(env.NODE_ENV === "production" && !isBuildTime
		? undefined
		: "build-only-auth-secret-0123456789abcdef0123456789abcdef");

const authBaseUrl =
	env.APP_URL ??
	env.API_BASE_URL ??
	process.env.BETTER_AUTH_URL?.trim() ??
	(env.NODE_ENV === "production" && !isBuildTime
		? undefined
		: "http://localhost:3000");

const socialProviders =
	env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
		? {
				google: {
					clientId: env.GOOGLE_CLIENT_ID,
					clientSecret: env.GOOGLE_CLIENT_SECRET,
				},
			}
		: {};

export const auth = betterAuth({
	...(authBaseUrl ? { baseURL: authBaseUrl } : {}),
	secret: authSecret,
	socialProviders,
	emailAndPassword: {
		enabled: true,
		autoSignIn: false,
	},
	user: {
		additionalFields: {
			role: {
				type: "string",
				input: false,
				defaultValue: "user",
			},
		},
	},
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					await trackUserSignup(user.id);
					const createdAt = new Date();

					const [existingAdmin] = await db
						.select({ id: schema.user.id })
						.from(schema.user)
						.where(eq(schema.user.role, "admin"))
						.orderBy(asc(schema.user.createdAt))
						.limit(1);
					if (!existingAdmin) {
						await db
							.update(schema.user)
							.set({ role: "admin" })
							.where(eq(schema.user.id, user.id));
					}

					const brandName = user.name.trim();
					const suffix = crypto.randomUUID().slice(0, 8);
					const slugBase =
						brandName
							.toLowerCase()
							.replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
							.replace(/^-+|-+$/g, "") || "brand";
					const organizationId = `org_${crypto.randomUUID()}`;
					const workspaceId = `workspace_${crypto.randomUUID()}`;

					await db.insert(schema.organization).values({
						id: organizationId,
						name: brandName,
						slug: `${slugBase}-${suffix}`,
						createdAt,
					});
					await db.insert(schema.member).values({
						id: `member_${crypto.randomUUID()}`,
						organizationId,
						userId: user.id,
						role: "owner",
						createdAt,
					});
					await db.insert(schema.workspaces).values({
						id: workspaceId,
						name: brandName,
						slug: `${slugBase}-${suffix}`,
						domain: "",
						tenantId: organizationId,
						createdAt,
					});
					await db.insert(schema.workspaceMembers).values({
						workspaceId,
						userId: user.id,
						role: "owner",
					});
				},
			},
		},
		session: {
			create: {
				before: async (session) => {
					const organization = await getActiveOrganization(session?.userId);
					return {
						data: {
							...session,
							activeOrganizationId: organization?.id ?? null,
						},
					};
				},
			},
		},
	},
	database: drizzleAdapter(db, {
		provider: "pg", // or "mysql", "sqlite"
		schema: {
			...schema,
			...authSchema,
		},
	}),
	plugins: [
		username({
			minUsernameLength: 3,
			maxUsernameLength: 32,
			usernameValidator: (value) => /^[a-zA-Z0-9_.-]+$/.test(value),
		}),
		organization(),
		nextCookies(),
	],
});
