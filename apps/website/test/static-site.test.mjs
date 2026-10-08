import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { load } from "cheerio";

const output = fileURLToPath(new URL("../out/", import.meta.url));
const origin = "https://geok.cloud";
const chineseRoutes = [
	"/",
	"/services-lite/",
	"/case-studies/",
	"/blog/",
	"/whitepaper/",
	"/blog/shanghai-local-geo/",
];
const routes = [
	...chineseRoutes,
	...chineseRoutes.map((route) => `/en${route}`),
];
const pages = new Map(
	routes.map((route) => [
		`/official-site${route}`,
		load(readFileSync(join(output, route, "index.html"), "utf8")),
	]),
);

test("coverage roundup links to a static article with localized metadata and original citations", () => {
	const sources = [
		"http://www.jingji.com.cn/zxxx/202610/t20261008_3249654.shtml",
		"http://www.cfgw.net.cn/xb/content/2026-10/08/content_25227400.html",
		"https://baijiahao.baidu.com/s?id=1878465842757004597",
	];
	for (const lang of ["", "en/"]) {
		const path = `/${lang}blog/shanghai-local-geo/`;
		const $ = pages.get(`/official-site${path}`);
		const blog = pages.get(`/official-site/${lang}blog/`);
		assert.equal(blog(".media-card-link").length, 1);
		assert.equal(
			blog(".media-card-link").attr("href"),
			`/official-site${path}`,
		);
		assert.equal($(".news-body section").length, 5);
		assert.ok($(".news-body").text().length > 1000);
		assert.equal($(".news-toc a").length, 5);
		assert.equal($(".news-related a").length, 3);
		const post = JSON.parse(
			$("script[type='application/ld+json']").text(),
		).mainEntity;
		assert.equal(post["@type"], "BlogPosting");
		assert.equal(post["@id"], `${origin}${path}#article`);
		assert.equal(post.url, $("link[rel=canonical]").attr("href"));
		assert.equal(post.headline, $("h1").text());
		assert.equal(post.description, $("meta[name=description]").attr("content"));
		assert.equal(post.inLanguage, lang ? "en" : "zh-CN");
		assert.equal(post.datePublished, $("time").attr("datetime"));
		assert.equal(post.dateModified, post.datePublished);
		assert.equal(post.mainEntityOfPage["@id"], `${origin}${path}#webpage`);
		assert.ok($(".news-meta").text().includes(post.author.name));
		assert.deepEqual(post.citation, sources);
		assert.deepEqual(
			$(".news-sources a")
				.map((_, el) => $(el).attr("href"))
				.get(),
			sources,
		);
		for (const link of $(".news-sources a").toArray()) {
			assert.equal($(link).attr("target"), "_blank");
			assert.equal($(link).attr("rel"), "noopener noreferrer");
		}
	}
});

for (const [route, $] of pages) {
	test(`${route} preserves static content, translations and scoped links`, () => {
		const canonicalPath = route.replace(/^\/official-site/, "") || "/";
		assert.equal($("main h1").length, 1);
		const english = canonicalPath.startsWith("/en/");
		assert.equal($("html").attr("lang"), english ? "en" : "zh-CN");
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
					if (english) {
						const actual =
							name === "data-i18n"
								? $(element).text()
								: $(element).attr(name.replace("data-i18n-", ""));
						assert.equal(actual, translations[value], `${route}: ${value}`);
					}
				}
			}
		}
		for (const element of $("[href], [src]").toArray()) {
			const target = $(element).attr("href") || $(element).attr("src");
			if (
				element.name === "link" &&
				["canonical", "alternate"].includes($(element).attr("rel"))
			)
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
	assert.deepEqual(organization.alternateName, ["秘蜂赢客GEO"]);
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

test("public contact paths and source-backed case labels survive embedding", () => {
	const $ = pages.get("/official-site/");
	assert.equal($("[data-case-tab]").length, 6);
	assert.equal($("#lead-form").length, 0);
	assert.ok($("#case-panel-0").text().includes("优化前"));
	assert.ok($(".case-source-note").text().includes("单次回答"));
	for (let i = 0; i < 3; i++) {
		const panel = $(`#case-panel-${i}`);
		const images = panel.find(".case-image-link img");
		assert.equal(images.length, i === 0 ? 2 : 1);
		images.each((_, image) => {
			assert.equal($(image).parent().attr("href"), $(image).attr("src"));
			assert.ok($(image).attr("alt")?.length > 10);
		});
	}
	assert.ok(
		pages
			.get("/official-site/case-studies/")("main")
			.text()
			.includes("麦核纹发"),
	);
	assert.equal(
		$("meta[name='google-site-verification']").attr("content"),
		"4144SYp8tO1fchyR6oakniZUOeuVSTej8lSxVLHbglY",
	);
	for (const page of pages.values()) {
		assert.equal(page("#consultation a[href='tel:19296462276']").length, 1);
		assert.equal(page("#consultation [data-action='close-modal']").length, 1);
		assert.ok(!page("body").text().includes("400-000-0000"));
		assert.ok(!page("body").text().includes("已收到，谢谢"));
	}
	assert.equal($("meta[name=theme-color]").attr("content"), "#ffffff");
	assert.ok(
		!readFileSync(join(output, "index.html"), "utf8").includes("__next_f"),
	);
});

test("language variants have reciprocal SEO signals and crawlable switch links", () => {
	const sitemap = load(readFileSync(join(output, "sitemap.xml"), "utf8"), {
		xmlMode: true,
	});
	const listed = sitemap("loc")
		.map((_, el) => sitemap(el).text())
		.get();
	assert.deepEqual(
		new Set(listed),
		new Set(routes.map((route) => `${origin}${route}`)),
	);
	assert.equal(listed.length, routes.length);
	for (const [route, $] of pages) {
		const publicPath = route.replace(/^\/official-site/, "");
		const chinesePath = publicPath.replace(/^\/en\//, "/");
		const alternates = {
			"zh-CN": chinesePath,
			en: `/en${chinesePath}`,
			"x-default": chinesePath,
		};
		assert.equal($("head link[rel=alternate]").length, 3);
		for (const [lang, path] of Object.entries(alternates)) {
			assert.equal(
				$(`head link[hreflang='${lang}']`).attr("href"),
				`${origin}${path}`,
			);
		}
		assert.equal(
			$("a[data-language=zh]").attr("href"),
			`/official-site${chinesePath}`,
		);
		assert.equal(
			$("a[data-language=en]").attr("href"),
			`/official-site/en${chinesePath}`,
		);
		assert.equal(
			$(".language-switch [aria-current=page]").attr("data-language"),
			publicPath.startsWith("/en/") ? "en" : "zh",
		);
		assert.equal($("script[src*='/i18n/']").length, 0);
		assert.equal($("button[data-action=language]").length, 0);
		const data = JSON.parse($("script[type='application/ld+json']").text());
		if (data["@type"] === "WebPage") {
			assert.equal(data.url, `${origin}${publicPath}`);
			assert.equal(data.inLanguage, $("html").attr("lang"));
			assert.equal(data.name, $("title").text().trim());
			assert.equal(
				data.description,
				$("meta[name=description]").attr("content"),
			);
		}
		if (publicPath.startsWith("/en/")) {
			for (const element of $("a[href^='/official-site/']").toArray()) {
				const href = $(element).attr("href");
				if (
					$(element).attr("data-language") === "zh" ||
					href.startsWith("/official-site/assets/")
				)
					continue;
				assert.ok(href.startsWith("/official-site/en/"), `${route}: ${href}`);
			}
		}
	}
});

test("Chinese main content is preserved during the multilingual build", () => {
	for (const route of chineseRoutes) {
		const source = load(
			readFileSync(
				fileURLToPath(new URL(`../site${route}index.html`, import.meta.url)),
				"utf8",
			),
		);
		assert.equal(
			pages.get(`/official-site${route}`)("main").text(),
			source("main").text(),
		);
	}
});

test("whitepaper is readable without JavaScript and identifies its edition and original download", () => {
	for (const lang of ["", "en/"]) {
		const $ = pages.get(`/official-site/${lang}whitepaper/`);
		const article = $(".whitepaper-article");
		assert.equal(article.find("section").length, 9);
		assert.equal($(".whitepaper-toc a[href^='#']").length, 10);
		assert.equal(article.find("#faq h3").length, 8);
		assert.equal(article.find("table tbody tr").length, 18);
		assert.equal(article.find("[hidden], iframe, [data-i18n]:empty").length, 0);
		assert.ok(article.text().length > (lang ? 15000 : 7000));
		const downloads = $("a[download]");
		assert.equal(downloads.length, 2);
		downloads.each((_, el) => {
			assert.equal(
				$(el).attr("download"),
				"上海本地生活AIGEO获客服务商调研白皮书.docx",
			);
			assert.equal(
				$(el).attr("href"),
				"/official-site/assets/downloads/shanghai-local-aigeo-whitepaper.docx",
			);
		});
		const page = JSON.parse($("script[type='application/ld+json']").text());
		const report = page.mainEntity;
		assert.equal(report["@type"], "Report");
		assert.equal(report.url, $("link[rel=canonical]").attr("href"));
		assert.equal(report.inLanguage, $("html").attr("lang"));
		assert.equal(report.headline, $("h1").text());
		assert.equal(report.mainEntityOfPage["@id"], page["@id"]);
		assert.equal(report.datePublished, $("time").attr("datetime"));
		assert.ok(
			$(".whitepaper-meta").text().includes(report.publisher.legalName),
		);
		assert.equal(report.encoding.inLanguage, "zh-CN");
		assert.equal(
			new URL(report.encoding.contentUrl).pathname,
			downloads.first().attr("href").replace("/official-site", ""),
		);
		assert.ok(!article.text().includes("以上内容复制到 Word 后"));
	}
	for (const [route, $] of pages) {
		const target = route.startsWith("/official-site/en/")
			? "/official-site/en/whitepaper/"
			: "/official-site/whitepaper/";
		assert.equal($(`.desktop-nav a[href='${target}']`).length, 1);
		assert.equal($(`#mobile-menu a[href='${target}']`).length, 1);
		assert.equal(
			$(".desktop-nav a[download], #mobile-menu a[download]").length,
			0,
		);
	}
});
