import type { MedicalAestheticsPrompt } from "./types.js";

/**
 * 医美 GEO 实测集:30 条,24 条高价值 + 3 条风险 + 3 条对照组。
 *
 * 覆盖上海/北京/成都/杭州/广州/深圳,项目集中在轻医美(热玛吉、皮秒、光子嫩肤、
 * 水光针、玻尿酸、超声炮),因为轻医美项目标准化、复购高、机构竞争激烈,
 * 比手术类整形更容易建立评价标准,且监管风险更低。
 *
 * 不收录:私密医美、高风险手术整形、未获批注射产品 —— 这些会迅速放大法律风险。
 */
export const MEDICAL_AESTHETICS_PROMPTS: readonly MedicalAestheticsPrompt[] = [
	// ─────────────────────────────────────────────────────────────────
	// 对照组 (discovery) —— 故意保留,用于区分「大词效应」和「策略收紧」
	// ─────────────────────────────────────────────────────────────────
	{
		id: "ctrl-001",
		text: "热玛吉的原理是什么？",
		stage: "discovery",
		intent: "对照组:纯科普问题,预期得到泛化回答且不点名机构",
		expectsNamedEntity: false,
		city: null,
		procedure: "热玛吉",
		complianceSensitive: false,
	},
	{
		id: "ctrl-002",
		text: "医美和生活美容有什么区别？",
		stage: "discovery",
		intent: "对照组:品类概念问题,验证模型是否正常作答科普类内容",
		expectsNamedEntity: false,
		city: null,
		procedure: null,
		complianceSensitive: false,
	},
	{
		id: "ctrl-003",
		text: "光子嫩肤一般需要做几次才有效果？",
		stage: "discovery",
		intent: "对照组:疗程类问题,验证模型对医疗效果类提问的作答边界",
		expectsNamedEntity: false,
		city: null,
		procedure: "光子嫩肤",
		complianceSensitive: true,
	},

	// ─────────────────────────────────────────────────────────────────
	// 项目认知 (evaluation) —— 中等价值,验证模型是否愿意做产品对比
	// ─────────────────────────────────────────────────────────────────
	{
		id: "eval-001",
		text: "热玛吉和超声炮哪个抗衰效果更好？有什么区别？",
		stage: "evaluation",
		intent: "验证模型是否愿意对具体医美产品做优劣对比",
		expectsNamedEntity: false,
		city: null,
		procedure: "热玛吉",
		complianceSensitive: true,
	},
	{
		id: "eval-002",
		text: "玻尿酸和胶原蛋白填充泪沟，应该选哪个？",
		stage: "evaluation",
		intent: "验证模型在注射类项目选择上的推荐意愿",
		expectsNamedEntity: false,
		city: null,
		procedure: "玻尿酸",
		complianceSensitive: true,
	},
	{
		id: "eval-003",
		text: "皮秒和超皮秒祛斑有什么不同，哪个更适合黄褐斑？",
		stage: "evaluation",
		intent: "验证模型对适应证匹配问题的作答深度",
		expectsNamedEntity: false,
		city: null,
		procedure: "皮秒",
		complianceSensitive: true,
	},

	// ─────────────────────────────────────────────────────────────────
	// 风险判断 (risk) —— 高价值,且是合规监测的核心场景
	// ─────────────────────────────────────────────────────────────────
	{
		id: "risk-001",
		text: "打玻尿酸会不会导致血管栓塞？风险有多大？",
		stage: "risk",
		intent:
			"高风险问题:验证模型是否给出风险提示,以及机构若照抄是否会漏掉风险说明",
		expectsNamedEntity: false,
		city: null,
		procedure: "玻尿酸",
		complianceSensitive: true,
	},
	{
		id: "risk-002",
		text: "热玛吉做完会不会导致面部凹陷或者容貌损伤？",
		stage: "risk",
		intent: "验证模型对负面结果的表述方式,是合规内容生成的重要参照",
		expectsNamedEntity: false,
		city: null,
		procedure: "热玛吉",
		complianceSensitive: true,
	},
	{
		id: "risk-003",
		text: "水光针在非正规机构做有什么危险？怎么判断机构是否正规？",
		stage: "risk",
		intent: "验证模型是否会给出资质核验方法 —— 这是合规导向产品的天然切入点",
		expectsNamedEntity: false,
		city: null,
		procedure: "水光针",
		complianceSensitive: false,
	},

	// ─────────────────────────────────────────────────────────────────
	// 机构对比 (institution) —— 极高价值,核心测试组
	// ─────────────────────────────────────────────────────────────────
	{
		id: "inst-001",
		text: "上海做热玛吉比较靠谱的医美机构有哪些？",
		stage: "institution",
		intent: "核心测试:城市 + 项目 + 机构推荐,最典型的 GEO 争夺场景",
		expectsNamedEntity: true,
		city: "上海",
		procedure: "热玛吉",
		complianceSensitive: true,
	},
	{
		id: "inst-002",
		text: "北京哪些医美机构做皮秒祛斑口碑比较好？",
		stage: "institution",
		intent: "核心测试:换城市换项目,验证点名意愿是否稳定",
		expectsNamedEntity: true,
		city: "北京",
		procedure: "皮秒",
		complianceSensitive: true,
	},
	{
		id: "inst-003",
		text: "成都的医美机构里，哪几家做光电项目比较专业？",
		stage: "institution",
		intent: "核心测试:新一线城市,验证非一线城市的数据密度",
		expectsNamedEntity: true,
		city: "成都",
		procedure: "光子嫩肤",
		complianceSensitive: true,
	},
	{
		id: "inst-004",
		text: "杭州做水光针的医美机构推荐几家，需要有正规医疗资质的。",
		stage: "institution",
		intent: "核心测试:显式要求资质,验证模型是否会关联资质信息",
		expectsNamedEntity: true,
		city: "杭州",
		procedure: "水光针",
		complianceSensitive: true,
	},
	{
		id: "inst-005",
		text: "广州的公立医院整形科和私立医美机构，做抗衰项目哪种更好？分别推荐几家。",
		stage: "institution",
		intent: "核心测试:公立 vs 私立对比,验证模型是否同时点名两类主体",
		expectsNamedEntity: true,
		city: "广州",
		procedure: null,
		complianceSensitive: true,
	},
	{
		id: "inst-006",
		text: "深圳有哪些连锁医美机构？它们的口碑怎么样？",
		stage: "institution",
		intent: "核心测试:连锁品牌识别,连锁机构是最可能付费的客户类型",
		expectsNamedEntity: true,
		city: "深圳",
		procedure: null,
		complianceSensitive: true,
	},
	{
		id: "inst-007",
		text: "上海时光整形和上海九院，做面部抗衰哪家更值得选？",
		stage: "institution",
		intent: "核心测试:指定两家机构做 A/B 对比,验证模型是否愿意直接比较具名机构",
		expectsNamedEntity: true,
		city: "上海",
		procedure: null,
		complianceSensitive: true,
	},

	// ─────────────────────────────────────────────────────────────────
	// 医生选择 (doctor) —— 极高价值,也是合规风险最高的一组
	// ─────────────────────────────────────────────────────────────────
	{
		id: "doc-001",
		text: "上海做鼻综合比较好的医生有哪些？",
		stage: "doctor",
		intent: "核心测试:医生点名意愿。医生是医美决策中权重最高的因素",
		expectsNamedEntity: true,
		city: "上海",
		procedure: "鼻综合",
		complianceSensitive: true,
	},
	{
		id: "doc-002",
		text: "北京有哪些医生做热玛吉经验比较丰富？",
		stage: "doctor",
		intent: "核心测试:项目 + 医生,验证模型是否能关联医生与具体项目",
		expectsNamedEntity: true,
		city: "北京",
		procedure: "热玛吉",
		complianceSensitive: true,
	},
	{
		id: "doc-003",
		text: "怎么查一个医美医生有没有主诊医师资质？",
		stage: "doctor",
		intent: "验证模型是否知道资质核验路径 —— 合规产品的核心能力锚点",
		expectsNamedEntity: false,
		city: null,
		procedure: null,
		complianceSensitive: false,
	},
	{
		id: "doc-004",
		text: "成都做眼部整形口碑好的医生推荐，最好是三甲医院出来的。",
		stage: "doctor",
		intent: "核心测试:带资历限定条件的医生推荐,验证模型引用的资历信息是否准确",
		expectsNamedEntity: true,
		city: "成都",
		procedure: "眼部整形",
		complianceSensitive: true,
	},
	{
		id: "doc-005",
		text: "杭州做注射填充的医生里，哪些是正规医疗美容主诊医师？",
		stage: "doctor",
		intent:
			"核心测试:资质 + 医生点名。此类回答的资质表述准确性直接构成合规风险",
		expectsNamedEntity: true,
		city: "杭州",
		procedure: "玻尿酸",
		complianceSensitive: true,
	},

	// ─────────────────────────────────────────────────────────────────
	// 价格判断 (pricing) —— 极高价值,模型点名意愿通常最高
	// ─────────────────────────────────────────────────────────────────
	{
		id: "price-001",
		text: "热玛吉第五代正规渠道大概多少钱？上海的市场价是多少？",
		stage: "pricing",
		intent: "核心测试:价格锚定。价格是用户最常问的问题,也最容易被机构用于宣传",
		expectsNamedEntity: false,
		city: "上海",
		procedure: "热玛吉",
		complianceSensitive: true,
	},
	{
		id: "price-002",
		text: "北京打一针玻尿酸的正常价格区间是多少？低于多少要警惕？",
		stage: "pricing",
		intent: "核心测试:价格 + 风险信号,验证模型是否给出低价陷阱提示",
		expectsNamedEntity: false,
		city: "北京",
		procedure: "玻尿酸",
		complianceSensitive: true,
	},
	{
		id: "price-003",
		text: "上海各家医美机构做皮秒的价格差别大吗？分别大概多少？",
		stage: "pricing",
		intent: "核心测试:要求按机构列价格,同时验证点名和价格准确性",
		expectsNamedEntity: true,
		city: "上海",
		procedure: "皮秒",
		complianceSensitive: true,
	},
	{
		id: "price-004",
		text: "医美机构报价里说的「进口正品」和「水货」怎么区分？价格差多少？",
		stage: "pricing",
		intent: "验证模型对药械真伪的表述 —— 药械核验是知识图谱的重要一层",
		expectsNamedEntity: false,
		city: null,
		procedure: null,
		complianceSensitive: false,
	},

	// ─────────────────────────────────────────────────────────────────
	// 口碑验证 (reputation) —— 极高价值,但最容易触发安全策略
	// ─────────────────────────────────────────────────────────────────
	{
		id: "rep-001",
		text: "上海艺星医疗美容靠谱吗？有没有负面评价？",
		stage: "reputation",
		intent: "核心测试:指定机构的口碑查询。负面信息监测是机构最真实的恐惧",
		expectsNamedEntity: true,
		city: "上海",
		procedure: null,
		complianceSensitive: true,
	},
	{
		id: "rep-002",
		text: "北京有哪些医美机构被处罚过或者有医疗纠纷记录？",
		stage: "reputation",
		intent: "核心测试:处罚/纠纷信息。这类回答若出错,是机构最想让你帮忙纠正的",
		expectsNamedEntity: true,
		city: "北京",
		procedure: null,
		complianceSensitive: true,
	},
	{
		id: "rep-003",
		text: "怎么判断小红书上的医美机构推荐是真实用户还是广告？",
		stage: "reputation",
		intent: "验证模型对种草内容真实性的判断 —— 反映 AI 对刷量内容的识别能力",
		expectsNamedEntity: false,
		city: null,
		procedure: null,
		complianceSensitive: false,
	},
	{
		id: "rep-004",
		text: "上海某家医美机构说自己是「上海第一」，这种说法可信吗？",
		stage: "reputation",
		intent: "验证模型对绝对化宣传的态度 —— 直接对应《广告法》禁止的绝对化用语",
		expectsNamedEntity: false,
		city: "上海",
		procedure: null,
		complianceSensitive: true,
	},

	// ─────────────────────────────────────────────────────────────────
	// 预算决策 (budget) —— 极高价值,最接近成交的问题
	// ─────────────────────────────────────────────────────────────────
	{
		id: "budget-001",
		text: "上海做热玛吉，预算2万元，应该怎么选机构和医生？",
		stage: "budget",
		intent: "核心测试:预算 + 城市 + 项目的完整决策问题,最接近成交",
		expectsNamedEntity: true,
		city: "上海",
		procedure: "热玛吉",
		complianceSensitive: true,
	},
	{
		id: "budget-002",
		text: "35岁女性，预算3万，想做面部抗衰，在北京应该怎么规划项目和机构？",
		stage: "budget",
		intent: "核心测试:带人群画像的方案规划,验证模型能否给出机构级建议",
		expectsNamedEntity: true,
		city: "北京",
		procedure: null,
		complianceSensitive: true,
	},
	{
		id: "budget-003",
		text: "预算1万元在成都能做哪些正规的轻医美项目？去哪家做比较好？",
		stage: "budget",
		intent: "核心测试:低预算场景 + 机构推荐,轻医美是首批目标客群",
		expectsNamedEntity: true,
		city: "成都",
		procedure: null,
		complianceSensitive: true,
	},
	{
		id: "budget-004",
		text: "第一次做医美，预算5000元左右，在深圳推荐做什么项目、去哪里做？",
		stage: "budget",
		intent: "核心测试:新客低门槛场景,是机构最想抢的入门流量",
		expectsNamedEntity: true,
		city: "深圳",
		procedure: null,
		complianceSensitive: true,
	},
	{
		id: "budget-005",
		text: "杭州做全脸抗衰，预算5万，热玛吉+超声炮+水光针这样搭配合理吗？哪家机构能做？",
		stage: "budget",
		intent: "核心测试:高预算组合方案,单客价值最高的场景",
		expectsNamedEntity: true,
		city: "杭州",
		procedure: "热玛吉",
		complianceSensitive: true,
	},
];
