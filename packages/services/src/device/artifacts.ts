import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { db, schema } from "@oneglanse/db";
import { NotFoundError } from "@oneglanse/errors";
import { eq, lt } from "drizzle-orm";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function artifactRoot(): string {
	return (
		process.env.AGENT_ARTIFACT_ROOT_DIR?.trim() ||
		path.resolve(process.cwd(), ".data", "artifacts")
	);
}

function safeSegment(value: string): string {
	return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
}

export async function saveDeviceScreenshot(args: {
	workspaceId: string;
	runId: string;
	promptId: string;
	provider: string;
	deviceId: string;
	kind: "success" | "failure";
	base64Png: string;
}): Promise<string> {
	const id = randomUUID();
	const relativeKey = path.join(
		safeSegment(args.workspaceId),
		safeSegment(args.runId),
		`${safeSegment(args.provider)}-${safeSegment(args.promptId)}-${id}.png`,
	);
	const absolutePath = path.join(artifactRoot(), relativeKey);
	await mkdir(path.dirname(absolutePath), { recursive: true });
	await writeFile(absolutePath, Buffer.from(args.base64Png, "base64"));
	await db.insert(schema.deviceArtifacts).values({
		id,
		workspaceId: args.workspaceId,
		runId: args.runId,
		promptId: args.promptId,
		provider: args.provider,
		deviceId: args.deviceId,
		kind: args.kind,
		storageKey: relativeKey,
		expiresAt: new Date(Date.now() + RETENTION_MS),
	});
	return id;
}

export async function readDeviceArtifact(args: {
	id: string;
	workspaceId: string;
}): Promise<Buffer> {
	const artifact = await db.query.deviceArtifacts.findFirst({
		where: (row, { and, eq }) =>
			and(eq(row.id, args.id), eq(row.workspaceId, args.workspaceId)),
	});
	if (!artifact) throw new NotFoundError("Device artifact not found.");
	return readFile(path.join(artifactRoot(), artifact.storageKey));
}

export async function cleanupExpiredDeviceArtifacts(): Promise<number> {
	const expired = await db.query.deviceArtifacts.findMany({
		where: (row, { lt }) => lt(row.expiresAt, new Date()),
	});
	for (const artifact of expired) {
		await unlink(path.join(artifactRoot(), artifact.storageKey)).catch(
			() => {},
		);
	}
	if (expired.length > 0) {
		await db
			.delete(schema.deviceArtifacts)
			.where(lt(schema.deviceArtifacts.expiresAt, new Date()));
	}
	return expired.length;
}
