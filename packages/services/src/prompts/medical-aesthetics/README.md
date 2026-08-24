# 医美 GEO 决策链 Prompt 库

用于验证「国内 AI 平台在医美问题上是否愿意给出具体推荐」的实测集。

## 为什么只收录决策链后段

品类大词（「医美是什么」「玻尿酸原理」）几乎必然得到泛化科普回答，模型不会点名机构。
用大词测 GEO 会得出系统性偏悲观的结论 —— 不是模型不愿推荐，是问题本身没有推荐诉求。

真正有商业价值、且模型确实会给出具体答案的，是决策链后段：

| 阶段 | stage | 商业价值 | 模型点名意愿 |
|---|---|---|---|
| 需求发现 | `discovery` | 低 | 低 |
| 项目认知 | `evaluation` | 中 | 中 |
| 风险判断 | `risk` | 高 | 中 |
| 机构对比 | `institution` | 极高 | **高** |
| 医生选择 | `doctor` | 极高 | **高** |
| 价格判断 | `pricing` | 极高 | **高** |
| 口碑验证 | `reputation` | 极高 | 中（易触发安全策略） |
| 预算决策 | `budget` | 极高 | **高** |

本库共 34 条，其中 25 条落在 `institution` / `doctor` / `pricing` / `reputation` /
`budget` 五个高价值阶段，19 条 `expectsNamedEntity: true`（即核心测试组）。

分布：

| stage | 条数 |
|---|---|
| `discovery`（对照组） | 3 |
| `evaluation` | 3 |
| `risk` | 3 |
| `institution` | 7 |
| `doctor` | 5 |
| `pricing` | 4 |
| `reputation` | 4 |
| `budget` | 5 |

28 条标记 `complianceSensitive: true` —— 占比之高本身就是信号：医美 GEO 的产出物
天然贴着《医疗广告管理办法》的边界，这是「合规」而非「刷曝光」应当成为产品
主张的实证理由。

## 为什么必须带对照组

`discovery` 阶段的 3 条是**故意保留的对照组**。如果实测结果是「对照组和高价值组
都拒答」，说明是模型的医疗安全策略整体收紧，方向需要重估；如果「对照组拒答、
高价值组点名」，说明拒答只是大词效应，方向成立。

没有对照组的话，这两种情况无法区分。

## 字段说明

- `id` — 稳定标识，跨轮次对比用，不要复用或改写
- `text` — 实际发给模型的问题原文
- `stage` — 决策链阶段
- `intent` — 该问题在商业上想验证什么
- `expectsNamedEntity` — 是否期待模型点名具体机构/医生。**这是核心指标**：
  统计这一组的点名率，就是「医美 GEO 是否可行」的答案
- `city` / `procedure` — 便于按城市、项目切片统计
- `complianceSensitive` — 该问题的回答若被机构照抄用于宣传，可能触及
  《医疗广告管理办法》。标 `true` 的回答需要走合规检查，不可直接作为素材

## 使用

```ts
import {
  MEDICAL_AESTHETICS_PROMPTS,
  getHighValuePrompts,
  getControlPrompts,
  summarizePromptLibrary,
} from "@oneglanse/services";

// 完整 34 条
MEDICAL_AESTHETICS_PROMPTS;

// 19 条核心测试组（expectsNamedEntity === true）
getHighValuePrompts();

// 3 条对照组
getControlPrompts();

// 分布统计，与 README 表格对齐
summarizePromptLibrary();
```

## 判读标准

跑完一轮后，按 `expectsNamedEntity: true` 这一组统计：

- **点名率 > 50%** — 方向成立，可以投入采集器开发
- **点名率 20–50%** — 方向可行但需换切入项目或城市，先扩大样本
- **点名率 < 20%，且对照组也拒答** — 模型医疗策略整体收紧，重估方向
- **点名率 < 20%，但对照组正常作答** — 是提问方式问题，改写 prompt 再测

单轮结果不可信：AI 回答有随机性，同一问题需采样 ≥3 次，取点名率而非单次结果。
