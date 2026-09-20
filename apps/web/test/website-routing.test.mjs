import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("public website assets do not expose the authenticated module or sibling routes", () => {
	const source = readFileSync(
		new URL("../middleware.ts", import.meta.url),
		"utf8",
	);
	const pattern = source.match(/"(\/\(\(\?![^"\n]+)"/)?.[1];
	assert.ok(pattern);
	const protectedPath = new RegExp(`^${pattern}$`);
	for (const path of [
		"/official-site",
		"/official-site/",
		"/official-site/blog",
		"/official-site/assets/logo.png",
	]) {
		assert.equal(protectedPath.test(path), false, path);
	}
	for (const path of [
		"/website",
		"/official-site-admin",
		"/official-sites",
		"/api/public/website",
		"/dashboard",
	]) {
		assert.equal(protectedPath.test(path), true, path);
	}
});
