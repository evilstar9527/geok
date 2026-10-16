import assert from "node:assert/strict";
import test from "node:test";
import { classifySourceMedia } from "../dist/index.js";

test("Douyin share links are social media, including bare and www domains", () => {
	for (const source of [
		"iesdouyin.com",
		"www.iesdouyin.com",
		"https://www.iesdouyin.com/share/video/123?region=CN",
		"https://www.douyin.com/video/123",
	]) {
		assert.equal(classifySourceMedia(source), "social", source);
	}
});

test("Douyin aliases still require an exact host or subdomain match", () => {
	for (const source of [
		"notiesdouyin.com",
		"iesdouyin.com.example.org",
		"https://example.org/iesdouyin.com",
	]) {
		assert.equal(classifySourceMedia(source), "other", source);
	}
});
