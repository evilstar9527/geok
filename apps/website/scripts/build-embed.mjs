import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const standalone = process.argv.includes("--standalone");
const basePath = standalone ? "" : "/official-site";
const toolUrl =
	process.env.NEXT_PUBLIC_TOOL_URL || "https://tool.geok.cloud/dashboard";
const output = new URL("../out/", import.meta.url);

rmSync(output, { recursive: true, force: true });
cpSync(new URL("../site/", import.meta.url), output, { recursive: true });
for (const route of ["", "services-lite/", "case-studies/", "blog/"]) {
	const file = new URL(`${route}index.html`, output);
	const html = readFileSync(file, "utf8")
		.replace(/\b(href|src)="(\/(?!\/)[^"]*)"/g, `$1="${basePath}$2"`)
		.replaceAll('href="https://tool.geok.cloud/"', `href="${toolUrl}"`);
	writeFileSync(file, html);
}
for (const name of ["robots.txt", "sitemap.xml"]) {
	const file = new URL(name, output);
	writeFileSync(file, readFileSync(file, "utf8"));
}

if (!standalone) {
	const target = new URL("../../web/public/official-site/", import.meta.url);
	rmSync(target, { recursive: true, force: true });
	cpSync(output, target, { recursive: true });
}
