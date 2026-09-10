import "server-only";
import { redis } from "@oneglanse/services";

export interface RateLimitConfig {
	limit: number;
	windowSecs: number;
}

// Atomic INCR + conditional EXPIRE — sets TTL only on first request (count === 1).
// Ensures TTL is never reset mid-window and avoids TTL-less keys on crash.
const RATE_LIMIT_LUA = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return current
`;

export function getClientIp(headers: Headers): string {
	// X-Real-IP is set by nginx to $remote_addr, which a client cannot forge.
	//
	// X-Forwarded-For is NOT trustworthy here: nginx uses $proxy_add_x_forwarded_for,
	// which appends the real address to whatever the client already sent, so the
	// *leftmost* entry is fully attacker-controlled. Reading it first let a caller
	// rotate a fake IP on every request and bypass every rate limit downstream.
	// If only XFF is present, take the last entry — the one the proxy appended.
	const realIp = headers.get("x-real-ip")?.trim();
	if (realIp) return realIp;

	const forwarded = headers.get("x-forwarded-for");
	if (forwarded) {
		const parts = forwarded.split(",");
		const appended = parts[parts.length - 1]?.trim();
		if (appended) return appended;
	}

	return "unknown";
}

export async function checkRateLimit(
	key: string,
	config: RateLimitConfig,
): Promise<{ allowed: boolean }> {
	try {
		const count = (await redis.eval(
			RATE_LIMIT_LUA,
			1,
			key,
			String(config.windowSecs),
		)) as number;
		return { allowed: count <= config.limit };
	} catch {
		return { allowed: true }; // fail open — Redis outage must not block all traffic
	}
}
