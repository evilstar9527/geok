/**
 * 信源实测报告（两段式）。
 *
 *   collect  在能连到 ClickHouse 的机器上跑，把某 workspace 的回答与引用落成 observations.json
 *   render   在任意机器上把 observations.json 渲染成 markdown
 *
 * 之所以拆成两段：生产环境的 ClickHouse 只绑 127.0.0.1:8123（docker-compose.yml 的
 * clickhouse 服务），开发机连不上；而渲染反复调格式时不该反复查库。collect 产出的
 * JSON 同时也是报告随附的原始数据。
 *
 * 报告口径见渲染出的「口径与范围」一节。核心是**回答级覆盖率**：某域名出现在多少条
 * 回答的参考资料里（同一回答内重复只记一次），而不是引用条次 —— 这是现有报告模板没有
 * 的指标，也是筛选发布渠道的关键。
 *
 * 两端都从各 package 的 dist 产物取代码，跑之前需要 pnpm build。collect 还要连库，
 * 须带上 .env；render 不查库、不需要 .env。
 *   node --env-file=.env scripts/source-report.mjs collect --workspace <id> --provider doubao \
 *     [--limit 13] [--since 2026-09-01] [--prompt-id <id>]... [--out observations.json]
 *
 *   node scripts/source-report.mjs render --in observations.json [--top 10] [--out report.md]
 *
 * 采样次数由 --limit 决定：每个提问取最近 N 条已采集回答，本脚本**不触发任何采集**。
 * 采集仍走应用（定时任务页可设 runCount，上限 50）。
 */

import { readFile, writeFile } from "node:fs/promises";
import { PROVIDER_DISPLAY } from "../packages/utils/dist/agent/providers.js";

const USAGE = `用法：
  node --env-file=.env scripts/source-report.mjs collect --workspace <id> --provider <provider> \\
    [--limit N] [--since <ISO>] [--prompt-id <id>]... [--out <path>]
  node scripts/source-report.mjs render --in <path> [--top N] [--out <path>]`;

function parseOptions(argv, spec) {
	const options = {};
	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		if (!token.startsWith("--")) throw new Error(`无法识别的参数：${token}`);
		const key = token.slice(2);
		const definition = spec[key];
		if (!definition) throw new Error(`未知选项：--${key}`);
		const value = argv[index + 1];
		if (value === undefined || value.startsWith("--"))
			throw new Error(`--${key} 缺少取值`);
		index += 1;
		if (definition.multiple) options[key] = [...(options[key] ?? []), value];
		else options[key] = value;
	}

	for (const [key, definition] of Object.entries(spec)) {
		if (options[key] === undefined && definition.required)
			throw new Error(`缺少必填选项：--${key}`);
		if (options[key] === undefined && definition.default !== undefined)
			options[key] = definition.default;
		if (definition.integer && options[key] !== undefined) {
			const parsed = Number(options[key]);
			if (!Number.isInteger(parsed) || parsed < 1)
				throw new Error(`--${key} 需要是正整数，收到：${options[key]}`);
			options[key] = parsed;
		}
	}

	return options;
}

function providerLabel(provider) {
	return PROVIDER_DISPLAY[provider]?.displayName ?? provider;
}

async function collect(argv) {
	const options = parseOptions(argv, {
		workspace: { required: true },
		provider: { required: true },
		limit: { default: 10, integer: true },
		since: {},
		"prompt-id": { multiple: true },
		out: { default: "observations.json" },
	});

	// 只引 ClickHouse 客户端，不走 @oneglanse/db 的入口 —— 入口会连带创建 Postgres
	// 连接池，而本脚本不查 Postgres，没必要为此要求 DATABASE_URL。
	// 用 dist 产物，跑之前需要 pnpm build。
	const { clickhouse } = await import(
		"../packages/db/dist/clients/clickhouse.js"
	);

	const filters = [
		"pr.model_provider = {provider:String}",
		"pr.workspace_id = {workspaceId:String}",
	];
	const params = {
		workspaceId: options.workspace,
		provider: options.provider,
	};
	if (options.since) {
		filters.push("pr.prompt_run_at >= parseDateTimeBestEffort({since:String})");
		params.since = options.since;
	}
	if (options["prompt-id"]?.length) {
		filters.push("pr.prompt_id IN {promptIds:Array(String)}");
		params.promptIds = options["prompt-id"];
	}

	// FINAL 是必须的：ReplacingMergeTree 在后台合并前会留下重复行，直接计数会把
	// 覆盖率的分母算错。这里和 fetchTemplateSnapshot 用的是同一套去重口径。
	const result = await clickhouse.query({
		query: `
			SELECT pr.id, pr.prompt_id, pr.prompt, pr.model_provider, pr.run_id,
				pr.sources, pr.collection_status,
				toString(toTimeZone(pr.prompt_run_at, 'UTC')) AS run_utc
			FROM (SELECT * FROM analytics.prompt_responses FINAL
				WHERE workspace_id = {workspaceId:String}) pr
			WHERE ${filters.join(" AND ")}
			ORDER BY pr.prompt_run_at, pr.id
		`,
		query_params: params,
		format: "JSONEachRow",
	});
	const rows = await result.json();

	const byPrompt = new Map();
	for (const row of rows) {
		const group = byPrompt.get(row.prompt_id) ?? [];
		group.push(row);
		byPrompt.set(row.prompt_id, group);
	}

	// 每个提问取最近 limit 条；行已按时间升序，末尾即最近。
	const selected = [];
	for (const group of byPrompt.values())
		selected.push(...group.slice(-options.limit));

	selected.sort(
		(a, b) => a.run_utc.localeCompare(b.run_utc) || a.id.localeCompare(b.id),
	);

	if (selected.length === 0) {
		throw new Error(
			`workspace ${options.workspace} 在 provider=${options.provider} 下没有已采集的回答${
				options.since ? `（--since ${options.since}）` : ""
			}`,
		);
	}

	const samples = selected.map((row, index) => ({
		ref: `S${String(index + 1).padStart(2, "0")}`,
		promptId: row.prompt_id,
		prompt: row.prompt,
		provider: row.model_provider,
		runAt: row.run_utc.replace(" ", "T"),
		runId: row.run_id || null,
		status: row.collection_status || "success",
		sourceCount: Array.isArray(row.sources) ? row.sources.length : 0,
		sources: (row.sources ?? [])
			.map((source) => ({
				title: source.title ?? "",
				url: source.url ?? "",
				domain: source.domain ?? null,
			}))
			.filter((source) => source.url),
	}));

	const observations = {
		generatedAt: new Date().toISOString(),
		workspaceId: options.workspace,
		provider: options.provider,
		limitPerPrompt: options.limit,
		since: options.since ?? null,
		samples,
	};

	await writeFile(options.out, `${JSON.stringify(observations, null, 2)}\n`);

	const promptCount = new Set(samples.map((sample) => sample.promptId)).size;
	const skipped = rows.length - selected.length;
	console.log(
		`已写入 ${options.out}：${samples.length} 条回答 / ${promptCount} 个提问${
			skipped > 0 ? `（另有 ${skipped} 条更早的回答未纳入）` : ""
		}`,
	);
}

/** 只做小写和去 www.；移动站/桌面站等变体交给渲染方在 JSON 里手工归并。 */
function normalizeDomain(rawDomain, url) {
	const candidate = rawDomain || safeHostname(url);
	if (!candidate) return null;
	return candidate.toLowerCase().replace(/^www\./, "");
}

function safeHostname(url) {
	try {
		return new URL(url).hostname;
	} catch {
		return null;
	}
}

function percent(part, total) {
	if (!total) return "—";
	return `${((part / total) * 100).toFixed(1)}%`;
}

function formatDate(isoString) {
	return isoString.slice(0, 10);
}

function toUtcIso(runAt) {
	return `${runAt}Z`;
}

function buildModel(observations) {
	const samples = observations.samples;

	// 提问按首次出现顺序编号；样本本身已按采集时间排列。
	const prompts = [];
	const promptIndex = new Map();
	for (const sample of samples) {
		let prompt = promptIndex.get(sample.promptId);
		if (!prompt) {
			prompt = {
				ref: `P${prompts.length + 1}`,
				promptId: sample.promptId,
				prompt: sample.prompt,
				samples: [],
			};
			promptIndex.set(sample.promptId, prompt);
			prompts.push(prompt);
		}
		prompt.samples.push(sample.ref);
	}

	const domains = new Map();
	for (const sample of samples) {
		const prompt = promptIndex.get(sample.promptId);
		const seenDomains = new Set();
		const seenUrls = new Set();
		for (const source of sample.sources) {
			const domain = normalizeDomain(source.domain, source.url);
			if (!domain) continue;
			if (!seenDomains.has(domain)) {
				seenDomains.add(domain);
				const entry = domains.get(domain) ?? {
					domain,
					samples: new Set(),
					occurrences: 0,
					byPrompt: new Map(),
					urls: new Map(),
				};
				entry.samples.add(sample.ref);
				const promptSamples = entry.byPrompt.get(prompt.ref) ?? new Set();
				promptSamples.add(sample.ref);
				entry.byPrompt.set(prompt.ref, promptSamples);
				domains.set(domain, entry);
			}
			const entry = domains.get(domain);
			entry.occurrences += 1;
			// 同一回答里同一 URL 出现多次只算一条，避免把「链接条次」也灌进样稿。
			if (!seenUrls.has(source.url)) {
				seenUrls.add(source.url);
				const urlEntry = entry.urls.get(source.url) ?? {
					title: source.title,
					samples: new Set(),
				};
				urlEntry.samples.add(sample.ref);
				if (!urlEntry.title && source.title) urlEntry.title = source.title;
				entry.urls.set(source.url, urlEntry);
			}
		}
	}

	const totalCitations = samples.reduce(
		(sum, sample) => sum + sample.sources.length,
		0,
	);
	const uniqueUrls = new Set(
		samples.flatMap((sample) => sample.sources.map((source) => source.url)),
	);

	const ranked = [...domains.values()].sort(
		(a, b) =>
			b.samples.size - a.samples.size ||
			b.occurrences - a.occurrences ||
			a.domain.localeCompare(b.domain),
	);

	return {
		samples,
		prompts,
		ranked,
		totalCitations,
		uniqueUrls: uniqueUrls.size,
	};
}

function renderMarkdown(observations, top) {
	const { samples, prompts, ranked, totalCitations, uniqueUrls } =
		buildModel(observations);
	const provider = providerLabel(observations.provider);
	const total = samples.length;
	const shown = ranked.slice(0, top);
	const firstRun = toUtcIso(samples[0].runAt);
	const lastRun = toUtcIso(samples.at(-1).runAt);

	const lines = [];
	lines.push(`# ${provider} 信源实测`, "");
	lines.push(
		`日期：${formatDate(observations.generatedAt)}。本批 ${total} 条回答，覆盖 ${prompts.length} 个提问；每个提问取最近 ${observations.limitPerPrompt} 条。`,
		"",
	);
	lines.push(
		"> **覆盖率**指某域名出现在多少条回答的「参考资料」列表中，同一回答内重复出现只记一次。",
		"> 它是渠道候选的筛选数据，**不等于**正文显式引用、品牌推荐率、发布后收录率或投资回报。",
		"",
	);

	lines.push("## 覆盖最高的渠道", "");
	lines.push(`按覆盖率排序，只列前 ${shown.length} 个域名。`, "");
	lines.push("| 渠道 | 参考资料命中 | 覆盖率 | 命中的提问 |");
	lines.push("|---|---:|---:|---|");
	for (const entry of shown) {
		const perPrompt = prompts
			.map((prompt) => {
				const hits = entry.byPrompt.get(prompt.ref)?.size ?? 0;
				return hits > 0
					? `${prompt.ref} ${hits}/${prompt.samples.length}`
					: null;
			})
			.filter(Boolean)
			.join("、");
		lines.push(
			`| ${entry.domain} | ${entry.samples.size}/${total} | ${percent(entry.samples.size, total)} | ${perPrompt || "—"} |`,
		);
	}
	lines.push("");

	lines.push("## 提问与样本数", "");
	for (const prompt of prompts) {
		lines.push(
			`- **${prompt.ref}（${prompt.samples.length} 次）**：${prompt.prompt}`,
		);
	}
	lines.push("");

	lines.push("## 信源频次", "");
	lines.push(
		`共取得 ${totalCitations} 条参考链接记录，${uniqueUrls} 个不同原始 URL，${ranked.length} 个不同域名。`,
		"",
	);
	lines.push(
		`| 网站/平台 | 出现次数 | 覆盖率 | ${prompts.map((prompt) => prompt.ref).join(" | ")} | 链接条次 |`,
	);
	lines.push(`|---|---:|---:|${prompts.map(() => "---:").join("|")}|---:|`);
	for (const entry of shown) {
		const perPrompt = prompts
			.map((prompt) => {
				const hits = entry.byPrompt.get(prompt.ref)?.size ?? 0;
				return hits > 0 ? `${hits}/${prompt.samples.length}` : "—";
			})
			.join(" | ");
		lines.push(
			`| ${entry.domain} | ${entry.samples.size}/${total} | ${percent(entry.samples.size, total)} | ${perPrompt} | ${entry.occurrences} |`,
		);
	}
	lines.push("");

	lines.push("## 具体样稿", "");
	lines.push(
		"仅证明这些页面曾进入本批参考资料；页面中的服务商排名、资质与效果说明未经核验，不应复制为事实。",
		"",
	);
	for (const entry of shown) {
		lines.push(`### ${entry.domain}（${entry.samples.size}/${total}）`, "");
		const urls = [...entry.urls.entries()]
			.sort(
				(a, b) =>
					b[1].samples.size - a[1].samples.size || a[0].localeCompare(b[0]),
			)
			.slice(0, 3);
		for (const [url, urlEntry] of urls) {
			const refs = [...urlEntry.samples].join("、");
			const title = urlEntry.title || url;
			lines.push(
				`- [${title}](${url})：出现在 ${urlEntry.samples.size} 条回答；样本编号 ${refs}。`,
			);
		}
		lines.push("");
	}

	lines.push("## 口径与范围", "");
	lines.push(
		`- 渠道：${provider}（${observations.provider}）；${total} 条回答 / ${prompts.length} 个提问，每个提问取最近 ${observations.limitPerPrompt} 条；采集时间 ${firstRun} – ${lastRun}。`,
	);
	lines.push(
		"- 覆盖率按回答去重，链接条次不去重。域名只做小写与去掉 www. 处理；移动站、桌面站及 com/cn 等变体未自动归并，需在 observations.json 中手工合并后再渲染。",
	);
	lines.push(
		"- 单工作区、单账号、同一时间窗口，结果可能受个性化、搜索缓存与时点影响，不能视为全部用户的概率。",
	);
	lines.push(
		"- 本次采集不包含正文显式引用、品牌推荐率、发布后收录率与投资回报；这些数据用于筛选发布渠道候选。",
	);
	lines.push(
		"- 采集器没有记录对话链接与页面摘要（「搜索 N 个关键词，参考 M 篇资料」），因此逐次记录只列可见链接数。",
	);
	lines.push("");

	lines.push("## 逐次记录", "");
	lines.push("| 编号 | 提问 | 采集时间（UTC） | 可见链接数 |");
	lines.push("|---|---|---|---:|");
	for (const sample of samples) {
		const ref =
			prompts.find((prompt) => prompt.promptId === sample.promptId)?.ref ?? "—";
		lines.push(
			`| ${sample.ref} | ${ref} | ${toUtcIso(sample.runAt)} | ${sample.sourceCount} |`,
		);
	}
	lines.push("");
	lines.push("完整参考链接见随附的 observations.json。", "");

	return lines.join("\n");
}

async function render(argv) {
	const options = parseOptions(argv, {
		in: { required: true },
		top: { default: 10, integer: true },
		out: {},
	});

	const observations = JSON.parse(await readFile(options.in, "utf8"));
	if (!Array.isArray(observations.samples) || observations.samples.length === 0)
		throw new Error(`${options.in} 里没有 samples`);

	const markdown = renderMarkdown(observations, options.top);

	if (options.out) {
		await writeFile(options.out, markdown);
		console.log(`已写入 ${options.out}`);
	} else {
		process.stdout.write(markdown);
	}
}

const [, , command, ...rest] = process.argv;

try {
	if (command === "collect") await collect(rest);
	else if (command === "render") await render(rest);
	else {
		console.error(USAGE);
		process.exit(1);
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
