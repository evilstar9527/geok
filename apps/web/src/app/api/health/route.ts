import { logger } from "@oneglanse/utils";
import { NextResponse } from "next/server";

// A cached 200 would keep reporting healthy long after a dependency went down,
// which is the one thing a health endpoint must never do.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ioredis is configured with a 10s connectTimeout and pg will wait on a dead
// socket far longer than a probe interval, so bound every check here instead of
// letting one hung dependency hold the response open.
const PROBE_TIMEOUT_MS = 3_000;

type Dependency = "postgres" | "redis" | "clickhouse";

async function probe(
	dependency: Dependency,
	check: () => Promise<unknown>,
): Promise<[Dependency, boolean]> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		await Promise.race([
			check(),
			new Promise<never>((_, reject) => {
				timer = setTimeout(
					() => reject(new Error(`${dependency} probe timed out`)),
					PROBE_TIMEOUT_MS,
				);
			}),
		]);
		return [dependency, true];
	} catch (error) {
		// Connection errors routinely embed the host and user, and this endpoint is
		// reachable without a session, so the detail goes to the log rather than
		// into the response body.
		logger.error(`[health] ${dependency} probe failed`, error);
		return [dependency, false];
	} finally {
		clearTimeout(timer);
	}
}

// Each client module throws at import time when its config is missing, so the
// imports are deferred into the probes: a misconfigured deployment then reports
// a structured 503 naming the broken dependency instead of a bare 500.
async function checkPostgres(): Promise<void> {
	const { pool } = await import("@oneglanse/db");
	await pool.query("select 1");
}

async function checkRedis(): Promise<void> {
	const { redis } = await import("@oneglanse/services");
	await redis.ping();
}

async function checkClickhouse(): Promise<void> {
	const { clickhouse } = await import("@oneglanse/db");
	const result = await clickhouse.ping();
	if (!result.success) {
		throw new Error(result.error?.message ?? "clickhouse ping failed");
	}
}

export async function GET() {
	const results = await Promise.all([
		probe("postgres", checkPostgres),
		probe("redis", checkRedis),
		probe("clickhouse", checkClickhouse),
	]);

	const checks = Object.fromEntries(
		results.map(([dependency, ok]) => [dependency, ok ? "ok" : "error"]),
	);
	const healthy = results.every(([, ok]) => ok);

	return NextResponse.json(
		{
			status: healthy ? "ok" : "error",
			timestamp: new Date().toISOString(),
			checks,
		},
		{ status: healthy ? 200 : 503 },
	);
}
