import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";

test("standalone publishes all language routes without installed build dependencies", (t) => {
	const root = mkdtempSync(join(tmpdir(), "geok-languages-"));
	t.after(() => rmSync(root, { recursive: true, force: true }));
	mkdirSync(join(root, "scripts"));
	cpSync(
		fileURLToPath(new URL("../site/", import.meta.url)),
		join(root, "site"),
		{ recursive: true },
	);
	cpSync(
		fileURLToPath(new URL("../scripts/build-embed.mjs", import.meta.url)),
		join(root, "scripts/build-embed.mjs"),
	);
	const toolUrl = "https://tool.example.test/dashboard?source=website&lang=en";
	execFileSync(
		process.execPath,
		[join(root, "scripts/build-embed.mjs"), "--standalone"],
		{ cwd: root, env: { ...process.env, NEXT_PUBLIC_TOOL_URL: toolUrl } },
	);
	const output = join(root, "out");
	const files = readdirSync(output, { recursive: true }).filter((file) =>
		file.endsWith("index.html"),
	);
	assert.equal(files.length, 12);
	for (const file of files) {
		const html = readFileSync(join(output, file), "utf8");
		const $ = load(html);
		assert.ok(!html.includes("/official-site/"), file);
		const canonical = new URL($("link[rel=canonical]").attr("href"));
		assert.equal(canonical.pathname, `/${file.replace(/index\.html$/, "")}`);
		assert.ok($(`a[href='${toolUrl}']`).length > 0, file);
		for (const element of $("a[href^='/'], [src^='/']").toArray()) {
			const target = new URL(
				$(element).attr("href") || $(element).attr("src"),
				canonical,
			);
			assert.ok(
				existsSync(
					join(
						output,
						target.pathname,
						target.pathname.endsWith("/") ? "index.html" : "",
					),
				),
				`${file}: ${target}`,
			);
		}
		const english = canonical.pathname.startsWith("/en/");
		assert.equal($("html").attr("lang"), english ? "en" : "zh-CN");
		assert.ok($("main").text().length > 300, file);
		if (canonical.pathname.includes("/blog/shanghai-local-geo/")) {
			const post = JSON.parse(
				$("script[type='application/ld+json']").text(),
			).mainEntity;
			assert.equal(post["@type"], "BlogPosting");
			assert.equal(post.url, canonical.href);
			assert.equal(post.headline, $("h1").text());
			assert.equal(post.inLanguage, english ? "en" : "zh-CN");
			assert.equal(post.citation.length, 3);
		}
		assert.equal(
			$("a[data-language=en]").attr("href"),
			`/en/${file.replace(/^en\//, "").replace(/index\.html$/, "")}`,
		);
		assert.equal(
			$("a[data-language=zh]").attr("href"),
			`/${file.replace(/^en\//, "").replace(/index\.html$/, "")}`,
		);
	}
});
