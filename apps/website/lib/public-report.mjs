import { load } from "cheerio";

export const REPORT_URL =
	"https://8.133.177.51:3000/report/report_a8314a36-fbc1-45f1-a2c2-3d676043c12a";

export function mentionRate(mentioned, analysed) {
	return analysed > 0 ? Math.round((mentioned / analysed) * 1000) / 10 : null;
}

// Read the public report's semantic HTML, never private dashboard APIs or scripts.
export function parsePublicReport(html) {
	const $ = load(html);
	const report = $('main[data-report-template="jianke"]');
	const brand = report.find("h1").first().text().trim();
	const generatedAt = report
		.find("header time")
		.first()
		.text()
		.replace(/\s*北京时间$/, "")
		.trim();
	if (
		brand !== "麦核纹发" ||
		!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(generatedAt)
	) {
		throw new Error("Public report brand or date could not be verified");
	}
	const tables = report.find("table").toArray();
	const rowsFor = (headers) =>
		tables
			.filter(
				(table) =>
					$(table)
						.find("thead th")
						.toArray()
						.map((th) => $(th).text().trim())
						.join("|") === headers,
			)
			.flatMap((table) =>
				$(table)
					.find("tbody tr")
					.toArray()
					.map((tr) =>
						$(tr)
							.find("td")
							.toArray()
							.map((td) => $(td).text().trim()),
					),
			);
	const records = rowsFor("编号|平台|采集时间（北京时间）|品牌状态|来源数");
	const platformRows = rowsFor("平台|采集|已分析|提及率|待分析");
	if (
		!platformRows.length ||
		new Set(records.map((r) => r[0])).size !== records.length ||
		records.some((r) => !["提及", "未提及", "待分析"].includes(r[3]))
	) {
		throw new Error("Public report records could not be verified");
	}
	const providers = platformRows.map(
		([name, collected, analysed, rate, pending]) => {
			const samples = records.filter((r) => r[1] === name);
			const count = samples.filter((r) => r[3] !== "待分析").length;
			const mentioned = samples.filter((r) => r[3] === "提及").length;
			const percent = mentionRate(mentioned, count);
			if (
				samples.length !== Number(collected) ||
				count !== Number(analysed) ||
				samples.length - count !== Number(pending) ||
				rate !== (percent === null ? "待分析" : `${percent}%`)
			) {
				throw new Error(`Public report counts do not match for ${name}`);
			}
			return { name, analysed: count, mentioned, percent };
		},
	);
	if (
		new Set(providers.map((p) => p.name)).size !== providers.length ||
		records.some((r) => !providers.some((p) => p.name === r[1]))
	) {
		throw new Error("Public report platforms do not match the records");
	}
	const analysed = providers.reduce((sum, p) => sum + p.analysed, 0);
	const mentioned = providers.reduce((sum, p) => sum + p.mentioned, 0);
	const article = report.find("article:has(blockquote)").first();
	const ref = article.find("span").first().text().trim().split(" · ")[0];
	const record = records.find((r) => r[0] === ref);
	const evidence = record
		? {
				ref,
				model: record[1],
				time: record[2],
				prompt: article.children("p").text().trim(),
				text: article.find("blockquote").text().trim(),
			}
		: null;
	const times = records.map((r) => r[2]).sort();
	return {
		url: REPORT_URL,
		brand,
		generatedAt,
		rangeStart: times[0] ?? null,
		rangeEnd: times.at(-1) ?? null,
		analysed,
		mentioned,
		pending: records.length - analysed,
		percent: mentionRate(mentioned, analysed),
		providers,
		evidence,
		// These domains are report-wide sources, not citations for the excerpt.
		sources: rowsFor("来源域名|记录数|占来源记录")
			.filter(([domain]) => domain !== "其余来源")
			.slice(0, 3)
			.map(([domain]) => domain),
	};
}

export async function fetchPublicReport(fetcher = fetch) {
	const response = await fetcher(REPORT_URL, {
		cache: "force-cache",
		signal: AbortSignal.timeout(15000),
	});
	if (!response.ok)
		throw new Error(`Public report returned HTTP ${response.status}`);
	// Fail the build on unavailable or changed data; do not publish mock numbers.
	return parsePublicReport(await response.text());
}
