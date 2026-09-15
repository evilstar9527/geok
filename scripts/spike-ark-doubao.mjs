// 一次性最小验证脚本：调用火山方舟 Responses API + web_search，确认
// 能否拿到「答案 + 引用来源」，用来评估替代/补充浏览器抓取豆包的可行性。
//
// 用法：
//   ARK_API_KEY=sk-xxx node scripts/spike-ark-doubao.mjs "你的 GEO prompt"
//   ARK_API_KEY=sk-xxx ARK_MODEL=doubao-seed-2-0-mini-260428 node scripts/spike-ark-doubao.mjs "…"
//
// 前置条件（方舟控制台）：创建 API Key、开通目标模型、开通「联网内容插件」。

const ARK_API_KEY = process.env.ARK_API_KEY;
const MODEL = process.env.ARK_MODEL || "doubao-seed-2-0-mini-260428";
const PROMPT =
	process.argv[2] ||
	process.env.SPIKE_PROMPT ||
	"2026年北京口碑最好的医美机构有哪些？请列出并说明理由";

if (!ARK_API_KEY) {
	console.error(
		'缺少 ARK_API_KEY。运行方式：ARK_API_KEY=sk-xxx node scripts/spike-ark-doubao.mjs "你的 prompt"',
	);
	process.exit(1);
}

const url = "https://ark.cn-beijing.volces.com/api/v3/responses";

console.log(`→ 模型: ${MODEL}`);
console.log(`→ 提问: ${PROMPT}\n`);

const res = await fetch(url, {
	method: "POST",
	headers: {
		Authorization: `Bearer ${ARK_API_KEY}`,
		"Content-Type": "application/json",
	},
	body: JSON.stringify({
		model: MODEL,
		input: [{ role: "user", content: PROMPT }],
		tools: [{ type: "web_search" }],
	}),
});

if (!res.ok) {
	const text = await res.text();
	console.error(`HTTP ${res.status}: ${text}`);
	process.exit(1);
}

const data = await res.json();

// —— 提取回答文本 ——
function collectText(node, out) {
	if (Array.isArray(node)) {
		for (const item of node) collectText(item, out);
		return;
	}
	if (node && typeof node === "object") {
		if (node.type === "output_text" && typeof node.text === "string") {
			out.push(node.text);
		}
		for (const value of Object.values(node)) collectText(value, out);
	}
}
const texts = [];
collectText(data, texts);
const answer = texts.join("\n").trim();

// —— 提取引用来源（递归扫所有含 http url 的对象）——
function collectCitations(node, out, seen) {
	if (Array.isArray(node)) {
		for (const item of node) collectCitations(item, out, seen);
		return;
	}
	if (node && typeof node === "object") {
		if (typeof node.url === "string" && /^https?:\/\//i.test(node.url)) {
			const key = node.url.replace(/#.*$/, "");
			if (!seen.has(key)) {
				seen.add(key);
				out.push({
					url: key,
					title: node.title || node.site_name || "",
					site_name: node.site_name || "",
					snippet: (node.snippet || node.summary || node.content || "").slice(
						0,
						200,
					),
				});
			}
		}
		for (const value of Object.values(node)) collectCitations(value, out, seen);
	}
}
const citations = [];
collectCitations(data, citations, new Set());

// —— 是否真的触发了联网 ——
const raw = JSON.stringify(data);
const searched = raw.includes("web_search_call");

console.log(
	`✓ 联网是否生效: ${searched ? "是（检测到 web_search_call）" : "否（需检查插件/模型开通）"}`,
);
console.log(`✓ 回答长度: ${answer.length} 字符`);
console.log(`✓ 引用来源数: ${citations.length}\n`);

console.log("===== 回答正文（前 1500 字）=====");
console.log(
	answer.slice(0, 1500) + (answer.length > 1500 ? "\n…（截断）" : ""),
);

console.log("\n===== 引用来源 =====");
if (citations.length === 0) {
	console.log("（无）");
} else {
	for (const c of citations) {
		console.log(
			`- ${c.title || "(无标题)"}${c.site_name ? ` [${c.site_name}]` : ""}`,
		);
		console.log(`  ${c.url}`);
		if (c.snippet) console.log(`  ${c.snippet}`);
	}
}

// 完整原始响应落盘，便于对照字段结构
const outFile = "ark-spike-output.json";
import { writeFileSync } from "node:fs";
writeFileSync(outFile, JSON.stringify(data, null, 2));
console.log(`\n完整原始响应已写入: ${outFile}（可删除）`);
