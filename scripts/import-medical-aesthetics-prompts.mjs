/**
 * 把医美 prompt 库导入指定 workspace。
 *
 * 走应用自己的 storePromptsForWorkspace,而不是手写 INSERT ——
 * 这样写进去的行一定是应用读得出来的格式,顺带验证了这条写入路径。
 *
 * 注意:storePromptsForWorkspace 是**全量同步**语义,不在传入列表里的
 * 既有 prompt 会被 ALTER TABLE DELETE 掉。这是它的设计,不是 bug。
 *
 * 用法:
 *   node scripts/import-medical-aesthetics-prompts.mjs <workspaceId> <userId> [--core] [--dry-run]
 *
 *   --core     只导入 19 条 expectsNamedEntity 核心测试组
 *   --dry-run  只打印将要写入的内容,不落库
 */

const [, , workspaceId, userId, ...flags] = process.argv;

if (!workspaceId || !userId) {
	console.error(
		"usage: node scripts/import-medical-aesthetics-prompts.mjs <workspaceId> <userId> [--core] [--dry-run]",
	);
	process.exit(1);
}

const coreOnly = flags.includes("--core");
const dryRun = flags.includes("--dry-run");

const { MEDICAL_AESTHETICS_PROMPTS, getHighValuePrompts, summarizePromptLibrary } =
	await import("../packages/services/dist/prompts/medical-aesthetics/index.js");

const selected = coreOnly ? getHighValuePrompts() : MEDICAL_AESTHETICS_PROMPTS;
const texts = selected.map((p) => p.text);

const summary = summarizePromptLibrary();
console.log(`prompt library: ${summary.total} total`);
console.log(`  selected for import: ${texts.length} (${coreOnly ? "core only" : "full library"})`);
console.log(`  byStage: ${JSON.stringify(summary.byStage)}`);
console.log(`  cities: ${summary.cities.join(", ")}`);
console.log();

if (dryRun) {
	for (const p of selected) {
		console.log(
			`  [${p.stage}${p.expectsNamedEntity ? "/core" : ""}] ${p.text}`,
		);
	}
	console.log("\n--dry-run: nothing written.");
	process.exit(0);
}

const { storePromptsForWorkspace } = await import(
	"../packages/services/dist/prompt/storePromptsForWorkspace.js"
);

console.log(`writing to workspace ${workspaceId} ...`);
const stored = await storePromptsForWorkspace({
	prompts: texts,
	workspaceId,
	userId,
});

console.log(`done. workspace now has ${stored.length} prompts.`);
process.exit(0);
