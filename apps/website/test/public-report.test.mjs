import assert from "node:assert/strict";
import test from "node:test";
import { fetchPublicReport, parsePublicReport } from "../lib/public-report.mjs";

const table = (headers, rows) =>
	`<table><thead><tr>${headers
		.split("|")
		.map((h) => `<th>${h}</th>`)
		.join(
			"",
		)}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
function fixture(statuses = ["提及", "未提及", "待分析"]) {
	const analysed = statuses.filter((s) => s !== "待分析").length;
	const mentioned = statuses.filter((s) => s === "提及").length;
	return `<main data-report-template="jianke"><header><time>2026-09-13 21:57 北京时间</time></header><h1>麦核纹发</h1>
    ${table("平台|采集|已分析|提及率|待分析", [["豆包", statuses.length, analysed, analysed ? `${(mentioned / analysed) * 100}%` : "待分析", statuses.length - analysed]])}
    ${table(
			"编号|平台|采集时间（北京时间）|品牌状态|来源数",
			statuses.map((s, i) => [`R0${i + 1}`, "豆包", "2026-09-13 12:00", s, 0]),
		)}
    <article><span>R01 · 豆包</span><blockquote>&lt;script&gt;原文&lt;/script&gt;</blockquote><p>上海纹发推荐</p></article>
    ${table("来源域名|记录数|占来源记录", [
			["example.com", 1, "100%"],
			["其余来源", 0, "0%"],
		])}
    </main>`;
}

test("pending responses are excluded; evidence stays plain text", () => {
	const r = parsePublicReport(fixture());
	assert.equal(r.analysed, 2);
	assert.equal(r.mentioned, 1);
	assert.equal(r.pending, 1);
	assert.equal(r.percent, 50);
	assert.equal(r.evidence.text, "<script>原文</script>");
	assert.deepEqual(r.sources, ["example.com"]);
});

test("empty and pending-only samples stay unknown; measured zero stays zero", () => {
	for (const statuses of [[], ["待分析"]]) {
		const r = parsePublicReport(fixture(statuses));
		assert.equal(r.percent, null);
		assert.equal(r.providers[0].percent, null);
	}
	assert.equal(parsePublicReport(fixture(["未提及"])).percent, 0);
});

test("rejects mismatched counts, missing records, wrong brand, and login pages", () => {
	assert.throws(() => parsePublicReport(fixture().replace("50%", "68%")));
	assert.throws(() => parsePublicReport(fixture().replace("编号", "改版")));
	assert.throws(() =>
		parsePublicReport(fixture().replace("麦核纹发", "另一个品牌")),
	);
	assert.throws(() => parsePublicReport("<html>Login</html>"));
});

test("unavailable report fails rather than returning mock data", async () => {
	await assert.rejects(
		fetchPublicReport(async () => ({ ok: false, status: 503 })),
		/503/,
	);
	await assert.rejects(
		fetchPublicReport(async () => {
			throw new Error("timeout");
		}),
		/timeout/,
	);
});
