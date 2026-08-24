/**
 * 医美 GEO 决策链 prompt 库。
 *
 * 用途:验证国内 AI 平台在医美问题上是否愿意给出具体机构/医生推荐 ——
 * 这是「医美垂直 GEO 是否可行」的前置判定。设计理由见 README.md。
 */

import { MEDICAL_AESTHETICS_PROMPTS } from "./prompts.js";
import {
	type DecisionStage,
	HIGH_VALUE_STAGES,
	type MedicalAestheticsPrompt,
} from "./types.js";

export { MEDICAL_AESTHETICS_PROMPTS } from "./prompts.js";
export {
	DECISION_STAGE_LIST,
	HIGH_VALUE_STAGES,
	type DecisionStage,
	type MedicalAestheticsPrompt,
} from "./types.js";

/**
 * 核心测试组:期待模型点名具体机构/医生的问题。
 *
 * 这一组的点名率就是可行性判定依据 —— 判读标准见 README.md。
 */
export function getHighValuePrompts(): MedicalAestheticsPrompt[] {
	return MEDICAL_AESTHETICS_PROMPTS.filter(
		(prompt) => prompt.expectsNamedEntity,
	);
}

/**
 * 对照组:预期不点名的科普类问题。
 *
 * 若对照组和核心组都拒答,说明是模型医疗策略整体收紧;若只有核心组拒答,
 * 说明是提问方式问题。没有对照组这两种情况无法区分。
 */
export function getControlPrompts(): MedicalAestheticsPrompt[] {
	return MEDICAL_AESTHETICS_PROMPTS.filter(
		(prompt) => prompt.stage === "discovery",
	);
}

export function getPromptsByStage(
	stage: DecisionStage,
): MedicalAestheticsPrompt[] {
	return MEDICAL_AESTHETICS_PROMPTS.filter((prompt) => prompt.stage === stage);
}

export function getPromptsByCity(city: string): MedicalAestheticsPrompt[] {
	return MEDICAL_AESTHETICS_PROMPTS.filter((prompt) => prompt.city === city);
}

/**
 * 需要走合规检查的 prompt —— 其回答不可直接作为宣传素材。
 */
export function getComplianceSensitivePrompts(): MedicalAestheticsPrompt[] {
	return MEDICAL_AESTHETICS_PROMPTS.filter(
		(prompt) => prompt.complianceSensitive,
	);
}

export interface PromptLibrarySummary {
	total: number;
	byStage: Record<DecisionStage, number>;
	expectsNamedEntity: number;
	complianceSensitive: number;
	inHighValueStages: number;
	cities: string[];
	procedures: string[];
}

/**
 * 分布统计。用于校验库的构成没有偏离设计意图(例如高价值阶段占比被稀释)。
 */
export function summarizePromptLibrary(): PromptLibrarySummary {
	const byStage = {} as Record<DecisionStage, number>;
	for (const prompt of MEDICAL_AESTHETICS_PROMPTS) {
		byStage[prompt.stage] = (byStage[prompt.stage] ?? 0) + 1;
	}

	const cities = new Set<string>();
	const procedures = new Set<string>();
	for (const prompt of MEDICAL_AESTHETICS_PROMPTS) {
		if (prompt.city) cities.add(prompt.city);
		if (prompt.procedure) procedures.add(prompt.procedure);
	}

	return {
		total: MEDICAL_AESTHETICS_PROMPTS.length,
		byStage,
		expectsNamedEntity: MEDICAL_AESTHETICS_PROMPTS.filter(
			(prompt) => prompt.expectsNamedEntity,
		).length,
		complianceSensitive: MEDICAL_AESTHETICS_PROMPTS.filter(
			(prompt) => prompt.complianceSensitive,
		).length,
		inHighValueStages: MEDICAL_AESTHETICS_PROMPTS.filter((prompt) =>
			HIGH_VALUE_STAGES.includes(prompt.stage),
		).length,
		cities: [...cities].sort(),
		procedures: [...procedures].sort(),
	};
}
