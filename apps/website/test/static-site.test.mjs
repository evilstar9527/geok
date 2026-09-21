import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { load } from "cheerio";

const output = fileURLToPath(new URL("../out/", import.meta.url));
const origin = "https://geok.cloud";
const routes = ["/", "/services-lite/", "/case-studies/", "/blog/"];
const pages = new Map(
	routes.map((route) => [
		`/official-site${route}`,
		load(readFileSync(join(output, route, "index.html"), "utf8")),
	]),
);

for (const [route, $] of pages) {
	test(`${route} preserves static content, translations and scoped links`, () => {
		const canonicalPath = route.replace(/^\/official-site/, "") || "/";
		assert.equal($("main h1").length, 1);
		assert.equal($("html").attr("lang"), "zh-CN");
		assert.ok($("main").text().trim().length > 300);
		assert.equal(
			$("link[rel=canonical]").attr("href"),
			`${origin}${canonicalPath}`,
		);
		assert.equal(
			$("script:not([src]):not([type='application/ld+json'])").length,
			0,
		);
		const page = $("body").attr("data-page");
		const translations = JSON.parse(
			readFileSync(join(output, `assets/i18n/${page}.js`), "utf8")
				.replace(/^window.JK_EN = /, "")
				.trim()
				.replace(/;$/, ""),
		);
		for (const element of $("*").toArray()) {
			for (const [name, value] of Object.entries(element.attribs)) {
				if (name === "data-i18n" || name.startsWith("data-i18n-")) {
					assert.equal(typeof translations[value], "string", value);
				}
			}
		}
		for (const element of $("[href], [src]").toArray()) {
			const target = $(element).attr("href") || $(element).attr("src");
			if (element.name === "link" && $(element).attr("rel") === "canonical")
				continue;
			const url = new URL(target, `${origin}${route}`);
			assert.ok(
				!url.hostname.includes("googleapis") &&
					!url.hostname.includes("gstatic"),
			);
			if (url.origin !== origin) {
				assert.equal(
					element.name,
					"a",
					`External render dependency: ${target}`,
				);
				continue;
			}
			if (url.pathname === "/dashboard") continue;
			assert.ok(url.pathname.startsWith("/official-site/"), target);
			const path = url.pathname.replace(/^\/official-site\//, "");
			assert.ok(
				existsSync(
					join(output, path, path.endsWith("/") || !path ? "index.html" : ""),
				),
				target,
			);
			if (url.hash)
				assert.equal(
					pages.get(url.pathname)?.(`[id="${url.hash.slice(1)}"]`).length,
					1,
					target,
				);
		}
	});
}

test("all fonts and styles are local and all JavaScript parses", () => {
	for (const relative of readdirSync(output, { recursive: true })) {
		const file = join(output, relative);
		if (relative.endsWith(".js")) new Script(readFileSync(file, "utf8"));
		if (!relative.endsWith(".css")) continue;
		for (const [, url] of readFileSync(file, "utf8").matchAll(
			/url\(["']?([^\s)"']+)/g,
		)) {
			assert.ok(!/^https?:/.test(url), url);
			if (!url.startsWith("data:"))
				assert.ok(existsSync(join(dirname(file), url)), url);
		}
	}
});

test("homepage entity references survive embedding and retain the public origin", () => {
	const $ = pages.get("/official-site/");
	const scripts = $("script[type='application/ld+json']");
	assert.equal(scripts.length, 1);
	const data = JSON.parse(scripts.text());
	assert.equal(data["@context"], "https://schema.org");
	const entities = new Map(
		data["@graph"].map((entity) => [entity["@id"], entity]),
	);
	assert.equal(entities.size, data["@graph"].length);
	const brand = entities.get(`${origin}/#brand`);
	const service = entities.get(`${origin}/#service`);
	const website = entities.get(`${origin}/#website`);
	const organization = entities.get(`${origin}/#organization`);
	assert.equal(brand["@type"], "Brand");
	assert.equal(brand.name, "秘蜂赢客");
	assert.equal(organization["@type"], "Organization");
	assert.equal(organization.legalName, "上海矩数智策科技有限公司");
	assert.equal(organization.alternateName, "矩数智策");
	assert.notEqual(organization["@id"], brand["@id"]);
	assert.equal(service.provider["@id"], organization["@id"]);
	assert.ok($("#about").text().includes(organization.legalName));
	assert.match(
		$("[data-i18n='home.operator']").text(),
		/秘蜂赢客.*矩数智策.*运营/,
	);
	assert.ok(!scripts.text().includes('"sameAs"'));
	assert.ok(!scripts.text().includes("400-000-0000"));
	assert.equal(service.brand["@id"], brand["@id"]);
	assert.equal(website.url, $("link[rel=canonical]").attr("href"));
	assert.ok($("main").text().includes(service.serviceType));
	const logo = new URL(brand.logo);
	assert.equal(logo.origin, origin);
	assert.ok(existsSync(join(output, logo.pathname)));
	function checkReferences(value) {
		if (!value || typeof value !== "object") return;
		if (value["@id"]) assert.ok(entities.has(value["@id"]), value["@id"]);
		for (const nested of Object.values(value)) checkReferences(nested);
	}
	checkReferences(data);
	assert.ok(!scripts.text().includes("/official-site"));
});

test("light original retains its honest sample labels and native interactions", () => {
	const $ = pages.get("/official-site/");
	assert.match($("main").text(), /示例数据/);
	assert.equal($("[data-case-tab]").length, 3);
	assert.equal($("#lead-form").length, 1);
	assert.equal($("meta[name=theme-color]").attr("content"), "#ffffff");
	assert.ok(
		!readFileSync(join(output, "index.html"), "utf8").includes("__next_f"),
	);
});
