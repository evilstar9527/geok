/**
 * Anonymous telemetry via PostHog.
 *
 * What is collected:
 *   - A one-way SHA-256 hash of the internal user ID (cannot be reversed to an email or name)
 *   - Event type: "user_signed_up" or "user_active"
 *   - Timestamp (implicit, added by PostHog on receipt)
 *
 * What is NOT collected: email, name, IP address, or any personally identifiable information.
 *
 * The PostHog project API key is hardcoded and write-only — it cannot be used to read data.
 *
 * Telemetry is OPT-IN. It used to run unconditionally on every authenticated page load,
 * which meant a self-hosted deployment silently shipped events to a third-party PostHog
 * project the operator does not own — contradicting the claim that no data leaves the
 * server. Set TELEMETRY_ENABLED=true to enable it. trackUserActive() runs in the root
 * layout's render path, so leaving it on also costs one outbound HTTP call per page view.
 */

import { createHash } from "node:crypto";
import { env } from "@/env";

const POSTHOG_KEY = "phc_u5esrkrxNLU7DjmSymdoCPQWxxWd68EtQSDWhfVV36Xk";
const POSTHOG_HOST = "https://app.posthog.com/capture/";

const TELEMETRY_ENABLED = env.TELEMETRY_ENABLED === "true";

function anonymousId(userId: string): string {
	return createHash("sha256").update(userId).digest("hex");
}

async function capture(event: string, userId: string): Promise<void> {
	if (!TELEMETRY_ENABLED) return;

	try {
		const res = await fetch(POSTHOG_HOST, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				api_key: POSTHOG_KEY,
				event,
				distinct_id: anonymousId(userId),
			}),
		});
		if (!res.ok) {
			console.error("[telemetry] PostHog responded", res.status);
		}
	} catch (err) {
		console.error("[telemetry] fetch failed", err);
	}
}

export async function trackUserSignup(userId: string): Promise<void> {
	await capture("user_signed_up", userId);
}

export async function trackUserActive(userId: string): Promise<void> {
	await capture("user_active", userId);
}
