"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLocale = "zh-CN" | "en";

const STORAGE_KEY = "supergeo.locale";

const ZH_CN_MESSAGES: Record<string, string> = {
	Account: "账户",
	Dashboard: "看板",
	Prompts: "提示词",
	Sources: "信源",
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
