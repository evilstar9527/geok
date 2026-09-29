import {
	cpSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const standalone = process.argv.includes("--standalone");
const basePath = standalone ? "" : "/official-site";
const origin = "https://geok.cloud";
const toolUrl =
	process.env.NEXT_PUBLIC_TOOL_URL || "https://tool.geok.cloud/dashboard";
const source = fileURLToPath(new URL("../site/", import.meta.url));
const output = fileURLToPath(new URL("../out/", import.meta.url));
const files = readdirSync(source, { recursive: true }).filter((file) =>
	file.endsWith("index.html"),
);
const escapeHtml = (value) =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll('"', "&quot;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
const decode = (value) =>
	value
		.replaceAll("&amp;", "&")
		.replaceAll("&quot;", '"')
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">");

// Bindings in the source are leaf elements, matching the former client translator.
// Keep this build dependency-free: standalone publishing runs with Node only.
function translate(original, translations) {
	const value = (key) => {
		if (typeof translations[key] !== "string")
			throw new Error(`Missing English translation: ${key}`);
		return escapeHtml(translations[key]);
	};
	const html = original.replace(
		/<([a-z][\w:-]*)\b([^>]*\bdata-i18n="([^"]+)"[^>]*)>[\s\S]*?<\/\1\s*>/gi,
		(_, tag, attrs, key) => `<${tag}${attrs}>${value(key)}</${tag}>`,
	);
	return html.replace(/<[a-z][^>]*>/gi, (originalTag) => {
		let tag = originalTag;
		for (const attr of [
			"placeholder",
			"aria-label",
			"title",
			"alt",
			"content",
			"href",
		]) {
			const key = tag.match(new RegExp(`data-i18n-${attr}="([^"]+)"`))?.[1];
			if (key)
				tag = tag.replace(
					new RegExp(`(\\s${attr}=)"[^"]*"`),
					(_, prefix) => `${prefix}"${value(key)}"`,
				);
		}
		return tag;
	});
}

rmSync(output, { recursive: true, force: true });
cpSync(source, output, { recursive: true });
const sitemapUrls = [];
const paths = new Set(
	files.map((file) => `/${file.replace(/index\.html$/, "")}`),
);
for (const file of files) {
	const original = readFileSync(join(source, file), "utf8");
	const route = `/${file.replace(/index\.html$/, "")}`;
	const page = original.match(/data-page="([^"]+)"/)?.[1];
	const translations = JSON.parse(
		readFileSync(join(source, `assets/i18n/${page}.js`), "utf8")
			.replace(/^window.JK_EN = /, "")
			.trim()
			.replace(/;$/, ""),
	);
	for (const language of ["zh-CN", "en"]) {
		const isEnglish = language === "en";
		const publicPath = isEnglish ? `/en${route}` : route;
		const url = `${origin}${publicPath}`;
		let html = isEnglish ? translate(original, translations) : original;
		html = html.replace(/<html lang="[^"]+"/, `<html lang="${language}"`);
		// English navigation stays in English, while assets and external URLs stay put.
		if (isEnglish)
			html = html.replace(/\bhref="(\/(?!\/)[^"]*)"/g, (match, href) => {
				const target = new URL(decode(href), origin);
				return paths.has(target.pathname) ? `href="/en${href}"` : match;
			});
		html = html.replace(
			/<button\b([^>]*data-action="language"[^>]*)>[\s\S]*?<\/button\s*>/g,
			(_, attrs) => {
				const englishLink = /data-language="en"/.test(attrs);
				const active = englishLink === isEnglish;
				return `<a href="${englishLink ? `/en${route}` : route}" data-language="${englishLink ? "en" : "zh"}" lang="${englishLink ? "en" : "zh-CN"}"${active ? ' aria-current="page"' : ""}>${englishLink ? "EN" : "中文"}</a>`;
			},
		);
		html = html.replace(
			/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
			`<link rel="canonical" href="${url}" />`,
		);
		const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/)?.[1].trim();
		const description = html.match(
			/<meta\s+name="description"[^>]*content="([^"]*)"[^>]*>/,
		)?.[1];
		if (!title || !description) throw new Error(`Missing metadata: ${file}`);
		const metadata = `
    <link rel="alternate" hreflang="zh-CN" href="${origin}${route}" />
    <link rel="alternate" hreflang="en" href="${origin}/en${route}" />
    <link rel="alternate" hreflang="x-default" href="${origin}${route}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="秘蜂赢客" />
    <meta property="og:title" content="${escapeHtml(decode(title))}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:locale" content="${isEnglish ? "en_US" : "zh_CN"}" />
    <meta property="og:image" content="${origin}/assets/social-preview.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="秘蜂赢客 GEO / Shanghai" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(decode(title))}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${origin}/assets/social-preview.png" />`;
		html = html.replace("</head>", `${metadata}\n  </head>`);
		html = html.replace(
			/<script\b[^>]*src="\/assets\/i18n\/[^>]*>\s*<\/script>/g,
			"",
		);
		html = html.replace(
			/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
			(_, content) => {
				const data = JSON.parse(content);
				if (data["@type"] === "WebPage")
					Object.assign(data, {
						"@id": `${url}#webpage`,
						url,
						name: decode(title),
						description: decode(description),
						inLanguage: language,
					});
				return `<script type="application/ld+json">${JSON.stringify(data).replaceAll("<", "\\u003c")}</script>`;
			},
		);
		// Preserve public metadata URLs while scoping browser navigation for the app iframe.
		html = html
			.replace(/\b(href|src)="(\/(?!\/)[^"]*)"/g, `$1="${basePath}$2"`)
			.replaceAll(
				'href="https://tool.geok.cloud/"',
				`href="${escapeHtml(toolUrl)}"`,
			)
			.replaceAll(
				'href="https://tool.geok.cloud/dashboard"',
				`href="${escapeHtml(toolUrl)}"`,
			);
		const destination = join(output, publicPath, "index.html");
		mkdirSync(dirname(destination), { recursive: true });
		writeFileSync(destination, html);
		sitemapUrls.push(url);
	}
}
writeFileSync(
	join(output, "sitemap.xml"),
	`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`,
);
if (!standalone) {
	const target = new URL("../../web/public/official-site/", import.meta.url);
	rmSync(target, { recursive: true, force: true });
	cpSync(output, target, { recursive: true });
}
console.log(
	`Built ${files.length} pages in Chinese and English (${standalone ? "standalone" : "embedded"}).`,
);
