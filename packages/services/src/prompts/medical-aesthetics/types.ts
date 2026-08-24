/**
 * 医美 GEO 决策链 prompt 库的类型定义。
 *
 * 设计要点见同目录 README.md —— 简言之:只收录决策链后段的问题,因为品类大词
 * 必然得到泛化科普,用大词测 GEO 会低估模型的实际点名意愿。
 */

/**
 * 用户决策阶段,按商业价值从低到高排列。
 *
 * `discovery` 只作为对照组存在:若它和高价值阶段一起拒答,说明是模型医疗策略
 * 整体收紧;若只有它拒答,说明拒答只是大词效应。
 */
export const DECISION_STAGE_LIST = [
	"discovery",
	"evaluation",
	"risk",
	"institution",
	"doctor",
	"pricing",
	"reputation",
	"budget",
] as const;

export type DecisionStage = (typeof DECISION_STAGE_LIST)[number];

/**
 * 期待模型点名具体实体的阶段。这五个阶段的点名率就是
 * 「医美垂直 GEO 是否可行」的判定依据。
 */
export const HIGH_VALUE_STAGES: readonly DecisionStage[] = [
	"institution",
	"doctor",
	"pricing",
	"reputation",
	"budget",
];

export interface MedicalAestheticsPrompt {
	/** 稳定标识,跨轮次对比用。不要复用或改写已发布的 id。 */
	id: string;
	/** 实际发给模型的问题原文。 */
	text: string;
	stage: DecisionStage;
	/** 该问题在商业上想验证什么。 */
	intent: string;
	/**
	 * 是否期待模型点名具体机构/医生。
	 *
	 * 这是核心指标:统计这一组的点名率,即可回答「医美 GEO 是否可行」。
	 */
	expectsNamedEntity: boolean;
	/** 城市,用于按地域切片统计。全国性问题为 null。 */
	city: string | null;
	/** 医美项目,用于按项目切片统计。跨项目问题为 null。 */
	procedure: string | null;
	/**
	 * 该问题的回答若被机构照抄用于宣传,是否可能触及《医疗广告管理办法》
	 * (效果承诺、绝对化表达、患者证言、容貌焦虑等)。
	 *
	 * 标 true 的回答必须走合规检查,不可直接作为宣传素材。
	 */
	complianceSensitive: boolean;
}
