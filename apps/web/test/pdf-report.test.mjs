import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { parsePdfReport } from "../../../packages/services/dist/report/pdfReport.js";

const original = Buffer.from("%PDF-1.7\noriginal imported report\n%%EOF\n");
const descriptor = {
	kind: "pdf",
	version: 1,
	title: "品牌实测报告",
	filename: "品牌实测报告.pdf",
	contentBase64: original.toString("base64"),
};
globalThis.__pdfReportTest = { parsePdfReport, descriptor };
const source = readFileSync(
	new URL("../src/app/report/[id]/pdf/route.ts", import.meta.url),
	"utf8",
)
	.replace(
		'import { PdfRendererBusyError, getReportPdf } from "@/lib/reports/pdf";',
		`
class PdfRendererBusyError extends Error {}
async function getReportPdf(id) {
  if (id === 'report_busy') throw new PdfRendererBusyError();
  if (id === 'report_pdf') throw new Error('Imported PDFs must bypass rendering');
  return Buffer.from('%PDF-1.7 generated %%EOF');
}`,
	)
	.replace(
		'import { getReportById, parsePdfReport } from "@oneglanse/services";',
		`
const { parsePdfReport, descriptor } = globalThis.__pdfReportTest;
async function getReportById({id}) {
  return id === 'report_missing' ? null : {
    brandName: '品牌', data: JSON.stringify(id === 'report_pdf' ? descriptor : {version: 3})
  };
}`,
	);
const compiled = ts.transpileModule(source, {
	compilerOptions: {
		module: ts.ModuleKind.ESNext,
		target: ts.ScriptTarget.ES2022,
	},
}).outputText;
const { GET } = await import(
	`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const request = (id, query = "") =>
	GET(new Request(`https://example.com/report/${id}/pdf${query}`), {
		params: Promise.resolve({ id }),
	});

test("imported PDF opens inline with original bytes and filename", async () => {
	const response = await request("report_pdf", "?view=1");
	assert.equal(response.status, 200);
	assert.equal(response.headers.get("Content-Type"), "application/pdf");
	assert.match(response.headers.get("Content-Disposition"), /^inline;/);
	assert(
		response.headers
			.get("Content-Disposition")
			.includes(encodeURIComponent(descriptor.filename)),
	);
	assert.deepEqual(Buffer.from(await response.arrayBuffer()), original);
});
test("imported PDF download returns an attachment without regenerating", async () => {
	const response = await request("report_pdf");
	assert.match(response.headers.get("Content-Disposition"), /^attachment;/);
	assert.deepEqual(Buffer.from(await response.arrayBuffer()), original);
});
test("generated reports, invalid IDs, missing reports and busy renderer retain behavior", async () => {
	assert.equal((await request("report_generated")).status, 200);
	assert.equal((await request("invalid")).status, 404);
	assert.equal((await request("report_missing")).status, 404);
	const busy = await request("report_busy");
	assert.equal(busy.status, 503);
	assert.equal(busy.headers.get("Retry-After"), "10");
});
test("PDF descriptor rejects corrupt content and unsafe filenames", () => {
	assert(parsePdfReport(JSON.stringify(descriptor)));
	for (const patch of [
		{ filename: "../file.pdf" },
		{ filename: "file\r\n.pdf" },
		{ contentBase64: Buffer.from("not a PDF").toString("base64") },
		{ contentBase64: Buffer.from("%PDF-1.7 truncated").toString("base64") },
		{ version: 2 },
	])
		assert.equal(
			parsePdfReport(JSON.stringify({ ...descriptor, ...patch })),
			null,
		);
	assert.equal(parsePdfReport("{invalid"), null);
	assert.equal(
		parsePdfReport(JSON.stringify({ version: 3, mentionRates: [] })),
		null,
	);
});
