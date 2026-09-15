import "server-only";

import { spawn } from "node:child_process";
import {
	access,
	mkdir,
	mkdtemp,
	readFile,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const cache = join(tmpdir(), "jianke-report-pdfs-v1");
const active = new Map<string, Promise<Buffer>>();

export class PdfRendererBusyError extends Error {}

async function render(id: string, target: string): Promise<Buffer> {
	const origin = `http://127.0.0.1:${process.env.PORT || "3000"}`;
	const response = await fetch(
		`${origin}/report/${encodeURIComponent(id)}?pdf=1`,
		{ signal: AbortSignal.timeout(15_000) },
	);
	if (!response.ok) throw new Error("Report page unavailable");
	let html = await response.text();
	if (!html.includes('data-report-template="jianke"'))
		throw new Error("Report template unavailable");
	// The template is server rendered; scripts are unnecessary for printing.
	html = html
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<head[^>]*>/i, `$&<base href="${origin}/">`);
	const directory = await mkdtemp(join(tmpdir(), "jianke-pdf-"));
	let child: ReturnType<typeof spawn> | undefined;
	try {
		const output = join(directory, "report.pdf");
		const input = join(directory, "report.html");
		await writeFile(input, html);
		child = spawn(
			process.env.CHROMIUM_PATH || "/usr/bin/chromium",
			[
				"--headless",
				"--no-sandbox",
				"--disable-gpu",
				"--disable-dev-shm-usage",
				"--no-first-run",
				"--no-pdf-header-footer",
				"--disable-background-networking",
				`--user-data-dir=${join(directory, "profile")}`,
				`--print-to-pdf=${output}`,
				pathToFileURL(input).href,
			],
			{ stdio: "ignore", detached: true },
		);
		let launchError: Error | undefined;
		child.on("error", (error) => {
			launchError = error;
		});
		const deadline = Date.now() + 60_000;
		while (Date.now() < deadline) {
			if (launchError) throw launchError;
			try {
				const pdf = await readFile(output);
				if (
					pdf.subarray(0, 5).toString() === "%PDF-" &&
					pdf.subarray(-1024).includes(Buffer.from("%%EOF"))
				) {
					await rename(output, target);
					return pdf;
				}
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
			}
			if (child.exitCode !== null)
				throw new Error("Chromium exited without a PDF");
			await new Promise((resolve) => setTimeout(resolve, 250));
		}
		throw new Error("PDF rendering timed out");
	} finally {
		if (child?.pid) {
			try {
				process.kill(-child.pid, "SIGTERM");
			} catch {
				/* Already exited. */
			}
			await new Promise((resolve) => setTimeout(resolve, 250));
			try {
				process.kill(-child.pid, "SIGKILL");
			} catch {
				/* Already exited. */
			}
		}
		await rm(directory, { recursive: true, force: true });
	}
}

export async function getReportPdf(id: string): Promise<Buffer> {
	if (!/^report_[A-Za-z0-9_-]+$/.test(id)) throw new Error("Invalid report ID");
	await mkdir(cache, { recursive: true });
	const target = join(cache, `${id}.pdf`);
	try {
		await access(target);
		return await readFile(target);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
	}
	const existing = active.get(id);
	if (existing) return existing;
	// One Chromium process at a time protects the collector's memory budget.
	if (active.size > 0) throw new PdfRendererBusyError("PDF renderer is busy");
	const pending = render(id, target);
	active.set(id, pending);
	try {
		return await pending;
	} finally {
		active.delete(id);
	}
}
