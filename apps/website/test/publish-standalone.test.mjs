import assert from "node:assert/strict";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { publishDirectory } from "../scripts/publish-standalone.mjs";

test("withdrawn article files are backed up and retired while other blog content survives", (t) => {
	const { source, target, backup } = fixture(t);
	const retired = [
		"blog/shanghai-local-geo/index.html",
		"en/blog/shanghai-local-geo/index.html",
		"assets/article.css",
		"assets/i18n/shanghai-local-geo.js",
	];
	for (const path of [...retired, "blog/unrelated/index.html"]) {
		mkdirSync(join(target, path, ".."), { recursive: true });
		writeFileSync(join(target, path), path);
	}
	publishDirectory(source, target, backup);
	for (const path of retired) {
		assert.equal(existsSync(join(target, path)), false);
		assert.equal(readFileSync(join(backup, path), "utf8"), path);
	}
	assert.ok(existsSync(join(target, "blog/unrelated/index.html")));
	const manifest = JSON.parse(
		readFileSync(join(backup, "release-files.json"), "utf8"),
	);
	assert.equal(manifest.filter((entry) => entry.retired).length, 4);
	assert.equal(publishDirectory(source, target, backup), 0);
});

test("article retirement rejects symlink ancestors before changing any live files", (t) => {
	const { source, target, backup } = fixture(t);
	symlinkSync(join(target, "assets"), join(target, "blog"));
	assert.throws(() => publishDirectory(source, target, backup), /symlink/);
	assert.equal(
		readFileSync(join(target, "index.html"), "utf8"),
		"old homepage",
	);
	assert.equal(existsSync(backup), false);
});

test("restored article source is published rather than retired", (t) => {
	const { source, target, backup } = fixture(t);
	const path = "blog/shanghai-local-geo/index.html";
	mkdirSync(join(source, path, ".."), { recursive: true });
	writeFileSync(join(source, path), "restored article");
	publishDirectory(source, target, backup);
	assert.equal(readFileSync(join(target, path), "utf8"), "restored article");
});

function fixture(t) {
	const root = mkdtempSync(join(tmpdir(), "geok-publish-"));
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const source = join(root, "source");
	const target = join(root, "public");
	const backup = join(root, "backup");
	mkdirSync(join(source, "assets"), { recursive: true });
	mkdirSync(join(target, "assets"), { recursive: true });
	writeFileSync(join(source, "index.html"), "new homepage");
	writeFileSync(join(target, "index.html"), "old homepage");
	writeFileSync(join(source, "assets", "brand.js"), "new asset");
	return { source, target, backup };
}

test("publishes owned files, backs up replacements, and preserves legacy apps", (t) => {
	const { source, target, backup } = fixture(t);
	mkdirSync(join(target, "dashboard"));
	writeFileSync(join(target, "dashboard", "index.html"), "legacy app");
	writeFileSync(join(target, "assets", "legacy.js"), "legacy asset");
	assert.equal(publishDirectory(source, target, backup), 2);
	assert.equal(
		readFileSync(join(target, "index.html"), "utf8"),
		"new homepage",
	);
	assert.equal(
		readFileSync(join(target, "assets", "brand.js"), "utf8"),
		"new asset",
	);
	assert.equal(
		readFileSync(join(backup, "index.html"), "utf8"),
		"old homepage",
	);
	assert.equal(
		readFileSync(join(target, "dashboard", "index.html"), "utf8"),
		"legacy app",
	);
	assert.equal(
		readFileSync(join(target, "assets", "legacy.js"), "utf8"),
		"legacy asset",
	);
	const manifest = JSON.parse(
		readFileSync(join(backup, "release-files.json"), "utf8"),
	);
	assert.ok(
		manifest.some((file) => file.path === "index.html" && file.existed),
	);
	assert.ok(
		manifest.some((file) => file.path === "assets/brand.js" && !file.existed),
	);
	assert.equal(publishDirectory(source, target, backup), 0);
});

test("rejects symlink destinations before modifying the homepage", (t) => {
	const { source, target, backup } = fixture(t);
	symlinkSync(join(target, "index.html"), join(target, "assets", "brand.js"));
	assert.throws(() => publishDirectory(source, target, backup), /symlink/);
	assert.equal(
		readFileSync(join(target, "index.html"), "utf8"),
		"old homepage",
	);
	assert.equal(existsSync(backup), false);
});

test("backup failure leaves live content unchanged", (t) => {
	const { source, target, backup } = fixture(t);
	mkdirSync(backup);
	assert.throws(() => publishDirectory(source, target, backup));
	assert.equal(
		readFileSync(join(target, "index.html"), "utf8"),
		"old homepage",
	);
	assert.equal(existsSync(join(target, "assets", "brand.js")), false);
});

test("rejects nested source and target roots", (t) => {
	const { source, backup } = fixture(t);
	assert.throws(
		() => publishDirectory(source, join(source, "assets"), backup),
		/separate directories/,
	);
});
