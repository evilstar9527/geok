import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Addresses that must never be reachable from a URL taken out of scraped
 * content: loopback, RFC1918, link-local (which is where cloud metadata lives at
 * 169.254.169.254), carrier-grade NAT, multicast and reserved space.
 */
function isBlockedAddress(address: string): boolean {
	if (isIP(address) === 6) {
		const normalized = address.toLowerCase();
		if (normalized === "::" || normalized === "::1") return true;
		// fc00::/7 unique-local, fe80::/10 link-local, ff00::/8 multicast.
		if (
			normalized.startsWith("fc") ||
			normalized.startsWith("fd") ||
			/^fe[89ab]/.test(normalized) ||
			normalized.startsWith("ff")
		) {
			return true;
		}
		// An IPv4-mapped address reaches the v4 target, so judge the v4 half.
		const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
		if (mapped?.[1]) return isBlockedAddress(mapped[1]);
		return false;
	}

	const [first, second] = address.split(".").map(Number);
	if (first === undefined || second === undefined) return true;

	return (
		first === 0 ||
		first === 10 ||
		first === 127 ||
		(first === 169 && second === 254) ||
		(first === 172 && second >= 16 && second <= 31) ||
		(first === 192 && second === 168) ||
		(first === 100 && second >= 64 && second <= 127) ||
		first >= 224
	);
}

/**
 * True only when `rawUrl` is http(s) and every address its host resolves to is a
 * public one. Source links are lifted straight out of model output and page DOM,
 * so without this a link to `http://clickhouse:8123/?query=...` would be fetched
 * by the worker from inside the compose network.
 *
 * This does not pin the resolved address, so a name that resolves to a public
 * address here and a private one at connection time (DNS rebinding) is still
 * possible; closing that would mean fetching by IP with a Host header.
 */
export async function isPublicHttpUrl(rawUrl: string): Promise<boolean> {
	let url: URL;
	try {
		url = new URL(rawUrl);
	} catch {
		return false;
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") return false;

	try {
		const addresses = await lookup(url.hostname, { all: true, verbatim: true });
		if (addresses.length === 0) return false;
		return addresses.every(({ address }) => !isBlockedAddress(address));
	} catch {
		// Unresolvable host: nothing to fetch, and no reason to treat it as safe.
		return false;
	}
}
