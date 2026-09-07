import { auth } from "@/lib/auth/auth";
import { db, schema } from "@oneglanse/db";
import { readDeviceArtifact } from "@oneglanse/services";
import { and, eq, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { id } = await context.params;
	const artifact = await db.query.deviceArtifacts.findFirst({
		where: (row, { eq }) => eq(row.id, id),
	});
	if (!artifact || artifact.expiresAt <= new Date()) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	const membership = await db.query.workspaceMembers.findFirst({
		where: (row) =>
			and(
				eq(row.workspaceId, artifact.workspaceId),
				eq(row.userId, session.user.id),
				isNull(row.deletedAt),
			),
	});
	if (!membership)
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	const image = await readDeviceArtifact({
		id,
		workspaceId: artifact.workspaceId,
	});
	return new NextResponse(new Uint8Array(image), {
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": "private, max-age=300",
			"Content-Disposition": `inline; filename="${id}.png"`,
		},
	});
}
