import assert from "node:assert/strict";
import test from "node:test";
import {
	planSourceRecovery,
	recoverSnapshotSources,
	sourceHash,
} from "./menglai-source-recovery.mjs";
const snapshot =
	'- link "- 1":\n  - /url: https://news.qq.com/rain/a/test?utm_source=x\n- link "- 1":\n  - /url: https://news.qq.com/rain/a/test#1\n- link "Source title":\n  - /url: https://publisher.example/article?id=42\n- link "用户服务协议":\n  - /url: https://publisher.example/terms\n- link "创作中心":\n  - /url: https://creator.xiaohongshu.com/publish\n- link "history":\n  - /url: /chat/private\n- text: https://unlinked.example/\n';
test("recovers visible reference links, preserving page IDs and excluding navigation", () => {
	const sources = recoverSnapshotSources({ provider: "deepseek", snapshot });
	assert.equal(sources.length, 2);
	assert.equal(sources[0].title, "news.qq.com");
	assert.equal(sources[1].url, "https://publisher.example/article?id=42");
	assert.equal(sources[1].cited_text, "");
	assert.deepEqual(
		recoverSnapshotSources({ provider: "yuanbao", snapshot }),
		[],
	);
});
test("handles quoted link labels and refuses credentials or malformed URLs", () => {
	const s = `    - 'link "A # reference"':\n      - /url: https://publisher.example/a\n- link "Login":\n  - /url: https://user:pass@publisher.example/\n`;
	assert.deepEqual(
		recoverSnapshotSources({ provider: "doubao", snapshot: s }).map(
			(x) => x.title,
		),
		["A # reference"],
	);
});
test("scoped recovery is idempotent and preserves unrelated metadata", () => {
	const item = {
		id: "s1",
		provider: "deepseek",
		answerSha256: sourceHash("original answer"),
		snapshot,
	};
	const row = {
		id: "s1",
		response: "original answer",
		model_provider: "deepseek",
		sources: [],
		collection_metadata: JSON.stringify({
			externalSampleId: "s1",
			promptGroup: "category",
			untouched: 42,
		}),
	};
	const { updates } = planSourceRecovery([item], [row], (r) => r.id);
	assert.equal(updates[0].metadata.untouched, 42);
	assert.equal(updates[0].metadata.promptGroup, "category");
	assert.equal(updates[0].metadata.sourcesCoverage, "snapshot_partial");
	const restored = {
		...row,
		sources: updates[0].sources,
		collection_metadata: JSON.stringify(updates[0].metadata),
	};
	assert.deepEqual(
		planSourceRecovery([item], [restored], (r) => r.id),
		{ updates: [], skipped: 1 },
	);
	assert.throws(
		() => planSourceRecovery([item, item], [row], (r) => r.id),
		/identity/,
	);
	assert.throws(
		() =>
			planSourceRecovery(
				[{ ...item, answerSha256: "bad" }],
				[row],
				(r) => r.id,
			),
		/hash/,
	);
	assert.throws(
		() =>
			planSourceRecovery(
				[item],
				[{ ...row, sources: [{ url: "existing" }] }],
				(r) => r.id,
			),
		/overwritten/,
	);
	assert.throws(
		() =>
			planSourceRecovery(
				[{ ...item, snapshot: `${snapshot}\nchanged` }],
				[restored],
				(r) => r.id,
			),
		/conflict/,
	);
});

const { extractReferenceBadge, parseReferenceBadge, planReferenceRecovery } =
	await import("./menglai-source-recovery.mjs");
test("reference badges preserve displayed counts without treating duplicate button text as more sources", () => {
	const snapshot =
		'- button "参考小红书与全网内容25篇":\n  - generic: 参考小红书与全网内容25篇';
	assert.equal(
		extractReferenceBadge({ provider: "diandian", snapshot }),
		"参考小红书与全网内容25篇",
	);
	assert.equal(parseReferenceBadge("diandian", "参考小红书与全网内容25篇"), 25);
	assert.equal(
		parseReferenceBadge("doubao", "搜索 6 个关键词，参考 31 篇资料"),
		31,
	);
	assert.equal(parseReferenceBadge("diandian", "给你的参考"), null);
	assert.equal(parseReferenceBadge("doubao", "参考小红书与全网内容25篇"), null);
	assert.equal(
		extractReferenceBadge({
			provider: "doubao",
			snapshot: "- paragraph: 参考 100 篇资料",
		}),
		null,
	);
	assert.throws(
		() =>
			extractReferenceBadge({
				provider: "diandian",
				snapshot: `${snapshot}\n- generic: 参考小红书与全网内容26篇`,
			}),
		/Ambiguous/,
	);
});
test("reference backfill is idempotent and metadata-only with conflict guards", () => {
	const item = {
		id: "d1",
		provider: "doubao",
		answerSha256: sourceHash("answer"),
		snapshotSha256: sourceHash("snapshot"),
		badge: "搜索 6 个关键词，参考 31 篇资料",
	};
	const row = {
		id: "d1",
		response: "answer",
		model_provider: "doubao",
		sources: [{ url: "https://example.com" }],
		collection_metadata: JSON.stringify({
			externalSampleId: "d1",
			promptGroup: "brand",
			sourceRecovery: { method: "keep" },
		}),
	};
	const { updates } = planReferenceRecovery([item], [row], (r) => r.id);
	assert.equal(updates[0].sources, undefined);
	assert.equal(updates[0].metadata.referenceEvidence.count, 31);
	assert.equal(updates[0].metadata.promptGroup, "brand");
	assert.deepEqual(updates[0].metadata.sourceRecovery, { method: "keep" });
	const restored = {
		...row,
		collection_metadata: JSON.stringify(updates[0].metadata),
	};
	assert.deepEqual(
		planReferenceRecovery([item], [restored], (r) => r.id),
		{ updates: [], skipped: 1 },
	);
	assert.throws(
		() => planReferenceRecovery([item, item], [row], (r) => r.id),
		/identity/,
	);
	assert.throws(
		() =>
			planReferenceRecovery(
				[{ ...item, answerSha256: "wrong" }],
				[row],
				(r) => r.id,
			),
		/hash/,
	);
	assert.throws(
		() =>
			planReferenceRecovery(
				[{ ...item, badge: "搜索 6 个关键词，参考 32 篇资料" }],
				[restored],
				(r) => r.id,
			),
		/conflicts/,
	);
});
