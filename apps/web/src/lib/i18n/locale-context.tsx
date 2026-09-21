"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLocale = "zh-CN" | "en";

const STORAGE_KEY = "supergeo.locale";

const ZH_CN_MESSAGES: Record<string, string> = {
	Account: "账户",
	Dashboard: "总览",
	Website: "官网",
	Prompts: "提问库",
	Sources: "引用来源",
	"Brand mentions": "品牌提及",
	Competitors: "竞品对比",
	Reports: "报告",
	"Generate a public, shareable report comparing your brand's mention rate with competitors.":
		"生成一份公开可分享的报告，对比您的品牌与竞品的提及率。",
	"Generated Reports": "已生成的报告",
	"No reports yet": "暂无报告",
	Schedule: "运行计划",
	People: "成员",
	Providers: "AI 平台",
	Settings: "设置",
	Workspace: "工作区",
	General: "常用功能",
	"Select Workspace": "选择工作区",
	"Create Workspace": "创建工作区",
	"Join Workspace": "加入工作区",
	"No workspaces yet": "暂无工作区",
	"Loading...": "加载中…",
	"Sign out": "退出登录",
	"Signed out successfully!": "已退出登录",
	"Failed to sign out!": "退出登录失败",
	"Connect Providers": "连接 AI 平台",
	"Providers are required": "需要连接 AI 平台",
	"Log in to any provider below, then close the browser window. Your auth is saved automatically, and you can continue as soon as one provider is active.":
		"请登录下方任一 AI 平台，完成后关闭浏览器窗口。授权状态会自动保存，至少连接一个平台后即可继续。",
	"Export JSON": "导出 JSON",
	"Export CSV": "导出 CSV",
	"Loading providers...": "正在加载 AI 平台…",
	Connecting: "连接中",
	Disconnected: "未连接",
	Connect: "连接",
	"Ready for prompt runs": "可运行提示词",
	"Reset all": "全部重置",
	"Skip for now": "暂时跳过",
	Continue: "继续",
	"Go to workspace": "进入工作区",
	"Select at least one prompt to run.": "请至少选择一条提示词。",
	"Run started.": "运行已开始。",
	"Failed to start run.": "启动运行失败。",
	"No prompts configured for this workspace.": "当前工作区尚未配置提示词。",
	"Pick a Workspace": "选择工作区",
	"Open a workspace to see your brand dashboard.":
		"打开一个工作区以查看品牌看板。",
	"Your Visibility Dashboard Starts Here": "从这里开始查看品牌可见度",
	"Run your first prompts to unlock rank, presence, sources, and competitor signals.":
		"运行第一批提示词，即可查看排名、提及率、信源和竞品表现。",
	"What this dashboard unlocks": "看板将展示",
	"Average rank across providers": "各平台平均排名",
	"Top source signals": "核心信源表现",
	"Top competitor signals": "主要竞品表现",
	"Open Prompts": "打开提示词",
	"No matching dashboard data": "没有符合条件的看板数据",
	"No data available for this model": "该模型暂无数据",
	"No data available for the selected filters": "当前筛选条件下暂无数据",
	"Try another model or run prompts across this model to populate the dashboard.":
		"请选择其他模型，或运行该模型的提示词以生成看板数据。",
	"Try another model or time range to populate the dashboard.":
		"请选择其他模型或时间范围。",
	"Analysis required": "需要分析数据",
	"No analyzed data available yet": "暂时没有已分析数据",
	"Run prompts and analysis to populate the dashboard.":
		"运行提示词并完成分析后即可生成看板。",
	"Go to Prompts": "前往提示词",
	"We couldn't load your dashboard": "无法加载看板",
	"Please try again in a moment. If the issue persists, check your workspace connection.":
		"请稍后重试；如果问题持续，请检查工作区连接状态。",
	Clear: "清除筛选",
	"Something went wrong while loading this page.": "加载此页面时出现问题。",
	"The app hit an unexpected server error. Refresh and try again. If it keeps happening, wait a moment and retry once the deploy settles.":
		"应用遇到了意外的服务端错误，请刷新后重试。如果反复出现，请稍等片刻再试。",
	"Try again": "重试",
	"Error reference": "错误编号",
	"Page not found": "页面不存在",
	"The page you are looking for doesn't exist or has been moved.":
		"您访问的页面不存在，或已被移动。",
	"Back to home": "返回首页",

	// Monitoring navigation
	Monitoring: "秘蜂监测",
	Overview: "总览",
	"Mention analysis": "品牌提及分析",
	"Citation sources": "引用来源",
	// Kept for the panels still labelled this way; not in the nav.
	"Sentiment analysis": "品牌情绪分析",
	"Source analysis": "引用来源",
	"Report center": "报告中心",
	"My reports": "我的报告",
	Configuration: "配置管理",

	// Monitoring metrics
	"Brand index overview": "品牌指数总览",
	"Mention rate": "提及率",
	"Brand mention rate": "品牌提及率",
	"First mention rate": "首位提及率",
	"Top3 mention rate": "Top3提及率",
	"Top6 mention rate": "Top6提及率",
	"Positive sentiment share": "正面情绪占比",
	"Negative sentiment share": "负面情绪占比",
	"Mention rate trend": "品牌提及率分析图表",
	"Brand leaderboard": "品牌排行榜",
	"Platform mention comparison": "AI平台品牌提及率对比分析",
	"Brand sentiment index": "品牌情绪指数",
	"Sentiment trend": "情绪趋势图表",
	"Industry sentiment terms": "行业情绪词",
	"Positive keywords": "正面关键词",
	"Negative keywords": "负面关键词",
	"Media distribution": "媒体分布分析",
	"Citation analysis": "内容引用分析",
	"Monitored brand": "监控品牌",
	"AI platform": "AI平台",
	"All platforms": "全平台",
	Reset: "重置",
	Rank: "排名",
	Brand: "品牌",
	"Current brand": "当前品牌",
	"View more": "查看更多",
	"No data": "暂无数据",
	"No keywords": "暂无关键词",
	"competitors suffix": "个竞品",
};

type LocaleContextValue = {
	locale: AppLocale;
	setLocale: (locale: AppLocale) => void;
	t: (message: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
	const [locale, setLocaleState] = useState<AppLocale>("zh-CN");

	useEffect(() => {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (stored === "zh-CN" || stored === "en") {
			setLocaleState(stored);
		}
	}, []);

	useEffect(() => {
		document.documentElement.lang = locale;
	}, [locale]);

	const value = useMemo<LocaleContextValue>(() => {
		return {
			locale,
			setLocale: (nextLocale) => {
				setLocaleState(nextLocale);
				window.localStorage.setItem(STORAGE_KEY, nextLocale);
			},
			t: (message) =>
				locale === "zh-CN" ? (ZH_CN_MESSAGES[message] ?? message) : message,
		};
	}, [locale]);

	return (
		<LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
	);
}

export function useLocale(): LocaleContextValue {
	const context = useContext(LocaleContext);
	if (!context) {
		throw new Error("useLocale must be used within LocaleProvider");
	}
	return context;
}
