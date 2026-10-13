/**
 * 给「麦核纹发」workspace 造一套演示数据(不做真实采集)。
 *
 * 数据来源不是拍脑袋编的,而是 `reports/zhitui-reference/`——那是从
 * app.zhituishidai.com 抓下来的同品牌真实监测快照。脚本复刻它的口径:
 *
 *   品牌提及率 24.18% (44/182)   首位提及率 0.55% (1/182)
 *   Top3提及率 16.48% (30/182)   15 条真实问题库、15 个竞品排行榜
 *
 * 两处刻意的偏离,原因见下:
 *
 * 1. 正面/负面情绪占比。参考站是 28.65% / 14.42%,但这两个数比提及率还大,
 *    说明它用的分母和提及率不同。本项目的 `summarizeBrands` 只在「已提及」的
 *    回答上计情绪(见 apps/web/.../dashboard/_utils/monitoring.ts),正面+负面
 *    天然被提及率封顶。这里按参考站的 2:1 比例缩放进 44 条提及里:正面 24 条
 *    (13.19%)、负面 12 条(6.59%)。其余三项提及指标仍精确复刻。
 *
 * 2. 竞品域名。参考快照只给了竞品名,没有域名,这里按名字补了合理值。
 *
 * 时间窗整体平移到最近 7 天(09-21 ~ 09-27),这样「最近 7 天」筛选也有数据。
 *
 * 用法:
 *   node scripts/seed-maihe-demo.mjs [输出目录]
 *
 * 只生成 JSONEachRow 文件,不碰数据库。灌库命令见文件末尾。
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const WORKSPACE_ID = "workspace_35c421ce-c212-481f-bffa-c36caad2ef1b";
const USER_ID = "tcflEHfqDy1OwlzSEPncWErsYFmXDirC";
const SELF = "麦核纹发";

const REF_DIR = new URL("../reports/zhitui-reference/api/", import.meta.url);

// ─── 目标口径 ────────────────────────────────────────────────────────────────
// 每天的分母(该日已分析回答数)和分子(提及/首位/Top3/正面/负面)。
// 合计 182 条回答、44 条提及、1 条首位、30 条 Top3、24 条正面、12 条负面。
const DAYS = [
	"2026-09-21",
	"2026-09-22",
	"2026-09-23",
	"2026-09-24",
	"2026-09-25",
	"2026-09-26",
	"2026-09-27",
];
const DAY_TOTAL = [30, 30, 30, 30, 30, 19, 13];
const DAY_MENTIONS = [9, 16, 10, 2, 5, 2, 0];
const DAY_TOP3 = [7, 11, 6, 1, 3, 2, 0];
const DAY_FIRST = [0, 1, 0, 0, 0, 0, 0];
const DAY_POSITIVE = [5, 8, 6, 1, 3, 1, 0];
const DAY_NEGATIVE = [2, 4, 3, 1, 1, 1, 0];

/** 竞品:名字、域名、(出现数, Top3数, 首位数的目标值)。取自参考站排行榜。 */
const COMPETITORS = [
	["Ksmp纹发", "ksmp.cn", 113, 111, 96],
	["露顶记纹发", "loudingji.com", 90, 52, 5],
	["黑米纹发", "heimiwenfa.com", 90, 55, 10],
	["韩国 KSMP 纹发", "ksmp.kr", 80, 79, 72],
	["密林 MILIN 纹发", "milinwenfa.com", 73, 41, 4],
	["麦田纹发", "maitianwenfa.com", 60, 25, 1],
	["乌尊 SMP 纹发", "wuzun-smp.com", 41, 23, 2],
	["华美医疗美容", "huameiyl.com", 37, 7, 2],
	["艺星医美", "yestar.com", 30, 2, 1],
	["易美医美", "yimeiyimei.com", 28, 2, 0],
	["韩国KSMP头皮美学", "ksmp.com.cn", 15, 15, 14],
	["ENOD纹发", "enod.com.cn", 11, 4, 0],
	["墨云纹发", "moyunwenfa.com", 2, 0, 0],
	["世和美艺纹发", "shihemeiyi.com", 1, 0, 0],
];

/** 参考站的情绪词云,这里当作分析产出的核心主张/差异点。 */
const POSITIVE_KEYWORDS = [
	"案例库大",
	"全国直营连锁",
	"流程规范",
	"直营模式",
	"签约质保",
	"一对一设计",
	"一次性无菌耗材",
	"工具一客一换",
	"技师统一培训",
	"无隐形消费",
	"韩系3D点阵仿真",
	"恢复期短",
	"售后补色体系完善",
	"审美自然",
	"老客转介绍多",
	"无推销无套路",
];

/** 分析结果里的风险等级。参考站只给了负面词,严重度是按语义估的。 */
const RISK_SEVERITIES = [
	"warning",
	"info",
	"info",
	"warning",
	"warning",
	"warning",
	"info",
	"info",
];

// ─── 确定性随机 ──────────────────────────────────────────────────────────────

/** mulberry32:同一个种子永远产出同一套数据,方便复跑和 review。 */
function mulberry32(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function hashString(value) {
	let h = 2166136261;
	for (let i = 0; i < value.length; i++) {
		h ^= value.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

function shuffled(list, rand) {
	const out = [...list];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/**
 * 在 [0,total) 里均匀取 count 个下标,恰好 count 个。offset 让不同实体错开,
 * 免得所有竞品都落在同样那几条回答上。
 */
function spread(total, count, offset = 0) {
	const picked = [];
	let acc = offset % total;
	for (let i = 0; i < total && picked.length < count; i++) {
		acc += count;
		if (acc >= total) {
			acc -= total;
			picked.push(i);
		}
	}
	return picked;
}

function uuid(rand) {
	const hex = "0123456789abcdef";
	let out = "";
	for (let i = 0; i < 32; i++) out += hex[Math.floor(rand() * 16)];
	return `${out.slice(0, 8)}-${out.slice(8, 12)}-4${out.slice(13, 16)}-a${out.slice(17, 20)}-${out.slice(20, 32)}`;
}

// ─── 参考数据 ────────────────────────────────────────────────────────────────

/** 参考快照的 JSON 前面带一行 `// <url>` 注释,先剥掉。 */
function readReference(name) {
	const raw = readFileSync(new URL(name, REF_DIR), "utf8");
	const body = raw.startsWith("//") ? raw.slice(raw.indexOf("\n") + 1) : raw;
	return JSON.parse(body).data;
}

const questions = readReference("boot-05-xingshu_questions.json").list;
const qaRecords = readReference("p6-55-ai-qa_records.json").records;
const sourceRecords = readReference("boot-18-sources_references.json").list;

/** 按问题归类真实回答原文,生成时优先用同题的那几条。 */
const answersByQuestion = new Map();
for (const record of qaRecords) {
	const list = answersByQuestion.get(record.question) ?? [];
	list.push(record.content);
	answersByQuestion.set(record.question, list);
}

/** 真实信源池,同样按问题归类,让引用和问题对得上。 */
const allSources = sourceRecords.map((source) => ({
	title: source.title,
	cited_text: source.title,
	url: source.url,
	domain: source.domain,
	favicon: source.site_icon ?? null,
}));
const sourcesByQuestion = new Map();
for (const source of sourceRecords) {
	const list = sourcesByQuestion.get(source.question_name) ?? [];
	list.push({
		title: source.title,
		cited_text: source.title,
		url: source.url,
		domain: source.domain,
		favicon: source.site_icon ?? null,
	});
	sourcesByQuestion.set(source.question_name, list);
}

// ─── 组装回答槽位 ────────────────────────────────────────────────────────────

/** 一天里所有 (问题 × 平台) 组合。平台只有参考站实际跑过的豆包和元宝。 */
const COMBOS = [];
for (let q = 0; q < questions.length; q++) {
	for (const provider of ["doubao", "yuanbao"]) {
		COMBOS.push({ q, provider });
	}
}

const slots = [];
for (let day = 0; day < DAYS.length; day++) {
	const total = DAY_TOTAL[day];
	// 分母不足 30 的日子(参考站最后两天),按下标均匀抽样,
	// 否则每天都只跑最前面几个问题。
	const comboIdx =
		total >= COMBOS.length
			? COMBOS.map((_, i) => i)
			: spread(COMBOS.length, total, day * 7);
	for (let i = 0; i < comboIdx.length; i++) {
		const combo = COMBOS[comboIdx[i]];
		slots.push({
			index: slots.length,
			day,
			slotOfDay: i,
			prompt: questions[combo.q].question,
			provider: combo.provider,
		});
	}
}

const daySlots = DAYS.map((_, day) => slots.filter((s) => s.day === day));

// ─── 品牌自身的提及 / 排名 / 情绪 ────────────────────────────────────────────

daySlots.forEach((group, day) => {
	const rand = mulberry32(hashString(`${SELF}-day-${day}`));

	const mentioned = shuffled(
		spread(group.length, DAY_MENTIONS[day], day * 3),
		rand,
	).map((i) => group[i]);

	// 排名:提及集合里最前面的若干条拿 Top3,其中最前面的拿首位。
	const top3 = mentioned.slice(0, DAY_TOP3[day]);
	const firstPlace = top3.slice(0, DAY_FIRST[day]);
	mentioned.forEach((slot, pos) => {
		slot.selfMentioned = true;
		if (firstPlace.includes(slot)) slot.selfRank = 1;
		else if (top3.includes(slot)) slot.selfRank = 2 + (pos % 2);
		else slot.selfRank = 4 + (pos % 6);
	});

	// 情绪:在提及集合里另起一次洗牌,和排名互不相关。
	const sentimentOrder = shuffled(mentioned, mulberry32(day * 977 + 13));
	sentimentOrder.forEach((slot, pos) => {
		if (pos < DAY_POSITIVE[day])
			slot.selfSentiment = 62 + Math.floor(rand() * 27);
		else if (pos < DAY_POSITIVE[day] + DAY_NEGATIVE[day])
			slot.selfSentiment = 15 + Math.floor(rand() * 24);
		else slot.selfSentiment = 45 + Math.floor(rand() * 14);
	});
});

// ─── 竞品出现与排名 ──────────────────────────────────────────────────────────

const competitorBySlot = slots.map(() => []);
for (const [name, domain, appearances, top3, firstPlace] of COMPETITORS) {
	const rand = mulberry32(hashString(`competitor-${name}`));
	const ordered = shuffled(
		spread(slots.length, appearances, hashString(name) % 97),
		rand,
	);

	ordered.forEach((slotIndex, pos) => {
		let rank;
		if (pos < firstPlace) rank = 1;
		else if (pos < top3) rank = 2 + (pos % 2);
		else rank = 4 + (pos % 6);

		competitorBySlot[slotIndex].push({
			name,
			domain,
			visibility: 30 + Math.floor(rand() * 50),
			sentiment: 48 + Math.floor(rand() * 30),
			rankPosition: rank,
			isRecommended: rank <= 3,
		});
	});
}

/**
 * 有极少数回答一条竞品都没落上(纯属均匀铺开时的空隙)。正文改写需要一个
 * 替换对象,否则那几条会留着麦核、和「未提及」的结论打架,所以补一个兜底
 * 竞品进去——排名放在 Top3 之外,不影响 Top3/首位那两个口径。
 */
const FALLBACK_COMPETITOR = COMPETITORS[0];
for (const pool of competitorBySlot) {
	if (pool.length === 0) {
		pool.push({
			name: FALLBACK_COMPETITOR[0],
			domain: FALLBACK_COMPETITOR[1],
			visibility: 45,
			sentiment: 55,
			rankPosition: 5,
			isRecommended: false,
		});
	}
}

// ─── 回答正文 ────────────────────────────────────────────────────────────────

/** 参考正文里的品牌写法五花八门(MICROINK麦核 / 麦核Microlnk SMP …)。 */
const BRAND_TOKEN = /[A-Za-z]*麦核[A-Za-z ]*/g;

function containsBrand(text) {
	BRAND_TOKEN.lastIndex = 0;
	return BRAND_TOKEN.test(text);
}

/**
 * 把正文里的麦核替换成本条回答列出的某个竞品。不做这步的话,「未提及」的
 * 结论会和正文里明晃晃写着麦核打架。
 */
function subtractBrand(text, slot) {
	const pool = competitorBySlot[slot.index];
	if (pool.length === 0) return text;
	const substitute = pool[slot.index % pool.length].name;
	return text.replace(BRAND_TOKEN, substitute);
}

/** 提及的回答优先用同题里正文真含麦核的那条,少做替换、更像原样。 */
function pickAnswer(slot) {
	const pool = answersByQuestion.get(slot.prompt) ?? [];
	if (pool.length === 0) return "";
	if (slot.selfMentioned) {
		const branded = pool.filter(containsBrand);
		const candidates = branded.length > 0 ? branded : pool;
		return candidates[slot.index % candidates.length];
	}
	return subtractBrand(pool[slot.index % pool.length], slot);
}

// ─── 产出三张表 ──────────────────────────────────────────────────────────────

function pad(n) {
	return String(n).padStart(2, "0");
}

const promptRows = questions.map((question, i) => ({
	id: uuid(mulberry32(hashString(`prompt-${i}`))),
	user_id: USER_ID,
	workspace_id: WORKSPACE_ID,
	prompt: question.question,
	sort_order: i,
	created_at: `2026-09-20 18:${pad(i)}:00`,
}));

const responseRows = [];
const analysisRows = [];

for (const slot of slots) {
	const rand = mulberry32(hashString(`slot-${slot.index}`));
	const id = uuid(rand);
	const analysisId = uuid(rand);
	const runId = uuid(mulberry32(hashString(`run-${slot.day}`)));
	const hour = 9 + (slot.slotOfDay % 9);
	const minute = (slot.slotOfDay * 7) % 60;
	const runAt = `${DAYS[slot.day]} ${pad(hour)}:${pad(minute)}:00`;
	const created = `${DAYS[slot.day]} ${pad(hour)}:${pad(Math.min(minute + 4, 59))}:30`;

	const promptRow = promptRows.find((p) => p.prompt === slot.prompt);
	const mentioned = slot.selfMentioned === true;
	const rank = mentioned ? slot.selfRank : null;
	const sentiment = mentioned ? slot.selfSentiment : 0;
	const visibility = mentioned ? 40 + Math.floor(rand() * 50) : 0;

	const pool = sourcesByQuestion.get(slot.prompt) ?? allSources;
	const picked = pool.filter((_, i) => i % 3 === slot.index % 3).slice(0, 5);
	const sources = picked.length > 0 ? picked : pool.slice(0, 3);

	const claims = mentioned
		? shuffled(POSITIVE_KEYWORDS, mulberry32(slot.index + 1)).slice(
				0,
				2 + (slot.index % 3),
			)
		: [];
	const riskItems = mentioned
		? shuffled(RISK_SEVERITIES, mulberry32(slot.index + 7))
				.slice(0, sentiment <= 40 ? 2 : 1)
				.map((severity) => ({ severity }))
		: [];

	responseRows.push({
		id,
		response_sort_id: id,
		prompt_id: promptRow.id,
		prompt: slot.prompt,
		user_id: USER_ID,
		workspace_id: WORKSPACE_ID,
		model: slot.provider,
		model_provider: slot.provider,
		response: pickAnswer(slot),
		sources,
		is_analysed: true,
		prompt_run_at: runAt,
		created_at: created,
		run_id: runId,
		execution_surface: "web",
		device_id: null,
		exposure_evaluated: true,
		exposure_terms: [SELF, "MicroInk"],
		exposure_matches: mentioned ? [SELF] : [],
		collection_metadata: JSON.stringify({ accountId: "default" }),
		collection_status: "success",
		failure_reason: null,
	});

	analysisRows.push({
		id: analysisId,
		response_id: id,
		prompt_id: promptRow.id,
		workspace_id: WORKSPACE_ID,
		user_id: USER_ID,
		model_provider: slot.provider,
		prompt: slot.prompt,
		prompt_run_at: runAt,
		created_at: created,
		brand_analysis: JSON.stringify({
			geoScore: {
				overall: mentioned
					? Math.round(
							Math.min(
								95,
								(rank === 1 ? 30 : rank <= 3 ? 18 : 6) +
									visibility * 0.4 +
									sentiment * 0.25,
							),
						)
					: 4 + (slot.index % 9),
			},
			presence: { mentioned, visibility },
			position: { rankPosition: rank },
			sentiment: { score: sentiment },
			recommendation: {
				type: !mentioned
					? "not_mentioned"
					: rank === 1
						? "top_pick"
						: rank <= 3
							? "strong_alternative"
							: sentiment >= 60
								? "conditional"
								: "mentioned_only",
			},
			competitors: competitorBySlot[slot.index],
			perception: {
				coreClaims: claims,
				differentiators: claims.slice(0, 1),
				bestKnownFor: mentioned ? "上海本地精品SMP纹发工作室" : null,
				pricingPerception: mentioned ? "mid_range" : "not_mentioned",
			},
			risks: { items: riskItems },
			metadata: { brandName: SELF, brandDomain: "microink.cn" },
		}),
	});
}

// ─── 落盘 ────────────────────────────────────────────────────────────────────

const outDir = process.argv[2] ?? join(tmpdir(), "maihe-seed");
mkdirSync(outDir, { recursive: true });

function writeJsonl(name, rows) {
	writeFileSync(
		join(outDir, name),
		`${rows.map((row) => JSON.stringify(row)).join("\n")}\n`,
		"utf8",
	);
	return rows.length;
}

const counts = [
	["user_prompts.jsonl", writeJsonl("user_prompts.jsonl", promptRows)],
	[
		"prompt_responses.jsonl",
		writeJsonl("prompt_responses.jsonl", responseRows),
	],
	["prompt_analysis.jsonl", writeJsonl("prompt_analysis.jsonl", analysisRows)],
];

// ─── 自检:算出来的口径必须和参考站对得上 ────────────────────────────────────

const parsed = analysisRows.map((row) => JSON.parse(row.brand_analysis));
const total = responseRows.length;
const rate = (n) => `${((n / total) * 100).toFixed(2)}%`;

const checks = [
	["已分析回答", String(total), "182"],
	[
		"品牌提及率",
		rate(parsed.filter((a) => a.presence.mentioned).length),
		"24.18%",
	],
	[
		"首位提及率",
		rate(parsed.filter((a) => a.position.rankPosition === 1).length),
		"0.55%",
	],
	[
		"Top3提及率",
		rate(
			parsed.filter(
				(a) => a.position.rankPosition !== null && a.position.rankPosition <= 3,
			).length,
		),
		"16.48%",
	],
	[
		"正面情绪占比",
		rate(
			parsed.filter((a) => a.presence.mentioned && a.sentiment.score >= 60)
				.length,
		),
		"13.19% ← 参考站 28.65%,分母口径不同,见文件头",
	],
	[
		"负面情绪占比",
		rate(
			parsed.filter((a) => a.presence.mentioned && a.sentiment.score <= 40)
				.length,
		),
		"6.59% ← 参考站 14.42%,分母口径不同,见文件头",
	],
];

console.log(`wrote to ${outDir}`);
for (const [name, count] of counts) console.log(`  ${name}: ${count}`);
console.log("\n口径自检:");
for (const [label, actual, expected] of checks) {
	console.log(`  ${label.padEnd(6)} ${actual.padEnd(8)} ← ${expected}`);
}

// 竞品排行榜:和参考站对照,兜底竞品会让个别名次轻微上浮。
const tally = new Map();
for (const analysis of parsed) {
	for (const competitor of analysis.competitors) {
		tally.set(competitor.name, (tally.get(competitor.name) ?? 0) + 1);
	}
}
console.log("\n竞品提及率(参考站 → 本套数据):");
const reference = new Map(COMPETITORS.map(([name, , count]) => [name, count]));
for (const [name, count] of [...tally.entries()].sort((a, b) => b[1] - a[1])) {
	const target = reference.get(name) ?? 0;
	console.log(
		`  ${name.padEnd(18)} ${rate(target).padStart(7)} → ${rate(count).padStart(7)}`,
	);
}

// 「未提及」的正文里不该再出现麦核,否则和分析结论打架。
const contradictions = responseRows.filter(
	(row, i) => !parsed[i].presence.mentioned && /麦核/.test(row.response),
);
console.log(
	`\n正文与分析矛盾(未提及但正文含麦核): ${contradictions.length} 条`,
);

const emptyResponses = responseRows.filter((row) => row.response === "").length;
console.log(`空正文: ${emptyResponses} 条`);
