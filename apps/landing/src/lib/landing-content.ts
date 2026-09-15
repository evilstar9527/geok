import {
	Activity,
	Boxes,
	Database,
	Eye,
	GitBranch,
	KeyRound,
	Radar,
	SearchCheck,
	ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SITE_LINKS } from "./site";

export const SITE_URLS = {
	github: SITE_LINKS.github,
	githubLicense: SITE_LINKS.license,
	signup: `${SITE_LINKS.homepage}/signup`,
	login: `${SITE_LINKS.homepage}/login`,
	docs: SITE_LINKS.docs,
	homepage: SITE_LINKS.homepage,
} as const;

type FeatureItem = {
	title: string;
	description: string;
	icon: LucideIcon;
};

export const FEATURE_ITEMS: FeatureItem[] = [
	{
		title: "本地免费运行",
		description: "装一次就在自己机器上跑，没有订阅，也没有用量上限。",
		icon: KeyRound,
	},
	{
		title: "使用你自己的账号",
		description: "用你自己的账号登录各个 AI 产品，登录态只留在你本机。",
		icon: ShieldCheck,
	},
	{
		title: "AI 可见度追踪",
		description: "看清你的品牌在哪些回答里出现，又在哪些回答里消失。",
		icon: Eye,
	},
	{
		title: "GEO 监测",
		description: "按模型分别追踪推荐强度、排名位置与情感倾向。",
		icon: Radar,
	},
	{
		title: "多渠道 Prompt 测试",
		description:
			"同一组 Prompt 跑遍 11 个渠道：ChatGPT、Claude、Gemini、Perplexity、AI Overview，以及豆包、DeepSeek、Kimi、元宝、千问和点点。",
		icon: SearchCheck,
	},
	{
		title: "可自托管的架构",
		description: "Web、Worker、队列与分析存储全部部署在你自己的基础设施上。",
		icon: Boxes,
	},
	{
		title: "ClickHouse 分析存储",
		description: "高并发地回答原文与分析数据，查询延迟保持在低位。",
		icon: Database,
	},
	{
		title: "开源的透明度",
		description: "从 Prompt 执行到最终指标的每一步都可以自己审阅。",
		icon: Activity,
	},
];

export const STORAGE_KEY = "oneglanse-landing-theme" as const;

export const METHOD_POINTS = [
	"11 个渠道全部通过真实产品界面监测：ChatGPT、Gemini、Perplexity、Claude、Google AI Overview，以及豆包、DeepSeek、Kimi、元宝、千问和点点。不通过模型 API 取数。",
	"你用各自的账号登录这些 AI 产品，登录态保存在本机，不离开你自己的基础设施。",
	"抓取到的回答用你自己的 OpenAI 或 Anthropic API Key 分析，数据不经过任何第三方服务器。",
	"同一个 Prompt，界面上的回答在排序、措辞和引用行为上都可能与 API 返回不同。",
	"多数 GEO 服务商不公开采集方式、刷新频率与模型版本信息。",
] as const;

export const OPEN_SOURCE_POINTS: Array<{ text: string; icon: LucideIcon }> = [
	{
		text: "本地免费运行，没有订阅，也不向第三方服务器发起调用。",
		icon: KeyRound,
	},
	{
		text: "使用你自己的 AI 产品账号，登录态只存在本机。",
		icon: ShieldCheck,
	},
	{
		text: "代码完全开源，提交记录与变更历史可逐条审计。",
		icon: GitBranch,
	},
	{
		text: "Docker 自托管整套栈：Web、Worker、队列与分析存储。",
		icon: Boxes,
	},
	{
		text: "Prompt、回答原文、引用来源与分析数据的归属完全在你手上。",
		icon: Database,
	},
];

export const FOOTER_LINKS = [
	{ label: "文档", href: SITE_URLS.docs },
	{ label: "GitHub", href: SITE_URLS.github },
	{ label: "许可证", href: SITE_URLS.githubLicense },
] as const;
