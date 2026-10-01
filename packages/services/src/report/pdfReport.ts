import { z } from "zod";

// Imported PDFs are frozen public reports, stored with the row so they survive
// application redeploys. Do not expose the base64 payload in workspace lists.
const pdfReportSchema = z.object({
	kind: z.literal("pdf"),
	version: z.literal(1),
	title: z.string().min(1).max(256),
	filename: z
		.string()
		.min(1)
		.max(256)
		.regex(/^[^\r\n/\\]+\.pdf$/i),
	contentBase64: z
		.string()
		.max(14_000_000)
		.regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

export function parsePdfReport(raw: string) {
	try {
		const result = pdfReportSchema.safeParse(JSON.parse(raw));
		if (!result.success) return null;
		const bytes = Buffer.from(result.data.contentBase64, "base64");
		if (
			bytes.toString("base64") !== result.data.contentBase64 ||
			bytes.subarray(0, 5).toString() !== "%PDF-" ||
			!bytes.subarray(-1024).includes(Buffer.from("%%EOF"))
		)
			return null;
		return result.data;
	} catch {
		return null;
	}
}
