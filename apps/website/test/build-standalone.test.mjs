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

test("standalone build works without installed dependencies and publishes navigable language variants", (t) => {
	const root = mkdtempSync(join(tmpdir(), "geok-standalone-"));
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
	const customTool =
		"https://tool.example.test/dashboard?source=website&lang=en";
	execFileSync(
		process.execPath,
		[join(root, "scripts/build-embed.mjs"), "--standalone"],
		{ cwd: root, env: { ...process.env, NEXT_PUBLIC_TOOL_URL: customTool } },
	);
	const output = join(root, "out");
	const files = readdirSync(output, { recursive: true }).filter((file) =>
		file.endsWith("index.html"),
	);
	assert.equal(files.length, 20);
	for (const file of files) {
		const html = readFileSync(join(output, file), "utf8");
		const $ = load(html);
		assert.ok(!html.includes("/official-site/"), file);
		const canonical = new URL($("link[rel=canonical]").attr("href"));
		assert.equal(canonical.pathname, `/${file.replace(/index\.html$/, "")}`);
		assert.ok($(`a[href='${customTool}']`).length > 0, file);
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
		const draft = new URL($(".contact-email-draft").attr("href"));
		assert.equal(draft.pathname, "neko@jushuzhice.cn");
		assert.equal(
			draft.searchParams.get("subject"),
			english ? "Store GEO consultation" : "门店 GEO 诊断咨询",
		);
		if (english) assert.ok($("main").text().includes("store"), file);
	}
});
