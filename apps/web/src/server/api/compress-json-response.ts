import { promisify } from "node:util";
import { gzip } from "node:zlib";

const gzipAsync = promisify(gzip);

function acceptsGzip(value: string | null): boolean {
	const encodings = new Map(
		(value ?? "").split(",").map((entry) => {
			const [name = "", ...parameters] = entry.trim().toLowerCase().split(";");
			const quality = parameters.find((part) => part.trim().startsWith("q="));
			return [name.trim(), quality ? Number(quality.trim().slice(2)) : 1];
		}),
	);
	return (encodings.get("gzip") ?? encodings.get("*") ?? 0) > 0;
}

/** Compress buffered tRPC JSON here: the production proxy does not compress it. */
export async function compressJsonResponse(
	request: Request,
	response: Response,
): Promise<Response> {
	if (
		!response.body ||
		response.headers.has("content-encoding") ||
		response.headers.get("content-type")?.split(";")[0]?.trim() !==
			"application/json"
	) {
		return response;
	}

	response.headers.append("Vary", "Accept-Encoding");
	if (!acceptsGzip(request.headers.get("accept-encoding"))) return response;

	const body = new Uint8Array(await response.arrayBuffer());
	const headers = new Headers(response.headers);
	let encoded = body;
	if (body.byteLength >= 1024) {
		const compressed = await gzipAsync(body);
		if (compressed.byteLength < body.byteLength) {
			encoded = new Uint8Array(compressed);
			headers.set("Content-Encoding", "gzip");
		}
	}
	// The body is now buffered, so do not retain upstream framing headers.
	headers.delete("Transfer-Encoding");
	headers.set("Content-Length", String(encoded.byteLength));
	return new Response(encoded, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
