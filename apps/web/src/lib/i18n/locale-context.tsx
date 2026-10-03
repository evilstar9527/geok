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
	"No workspace selected.": "尚未选择工作区。",
	"Workspace & Organization": "工作区与组织",
	"Brand Workspace": "品牌工作区",
	"Brand Name": "品牌名称",
	"Brand Domain": "品牌域名",
	"e.g. Pipedrive": "例如：秘蜂赢客",
	"e.g. pipedrive.com": "例如：example.com",
	"Used to track your brand visibility and citations in AI responses.":
		"用于追踪品牌在人工智能回答中的可见度和引用情况。",
	"Warning: Changing brand details clears all analyzed data in this workspace. Raw prompt responses are not deleted.":
		"注意：修改品牌信息将清空此工作区的分析数据，原始提问回答会保留。",
	Cancel: "取消",
	Organization: "组织",
	"Organization Name": "组织名称",
	"Enter organization name": "请输入组织名称",
	"Only workspace owners can rename the organization.":
		"仅工作区所有者可以修改组织名称。",
	"Invite with a Code": "通过邀请码邀请",
	"Workspace Join Code": "工作区邀请码",
	"Share this code with teammates to let them join instantly. Each workspace has a globally unique code.":
		"将邀请码分享给团队成员即可加入。每个工作区的邀请码全局唯一。",
	"Organization:": "组织：",
	"Workspace:": "工作区：",
	"Workspace code": "工作区邀请码",
	Copy: "复制",
	Members: "成员",
	"Email address (we'll invite if needed)": "邮箱地址（必要时发送邀请）",
	Member: "成员",
	Owner: "所有者",
	Add: "添加",
	"Invite Your First Teammate": "邀请第一位团队成员",
	"Share prompts, schedules, and analysis in one workspace.":
		"在同一工作区共享提问、运行计划和分析结果。",
	"Invite teammate": "邀请团队成员",
	Name: "名称",
	Email: "邮箱",
	Role: "角色",
	"Open a workspace to draft press articles from its sources.":
		"打开工作区，根据其信源撰写新闻稿。",
	"How to format": "格式说明",
	"Separate each prompt with a blank line. A single prompt can span multiple lines — just don&apos;t leave a blank line in the middle of it.":
		"每条提问之间用空行分隔。单条提问可以跨多行，但中间不要留空行。",
	"Strong Prompts Usually": "优质提问通常",
	"focus on what the target audience is searching for: comparing options, finding alternatives, evaluating pricing, or choosing the best fit for a use case.":
		"围绕目标受众的搜索需求：比较方案、寻找替代品、评估价格，或选择适合具体场景的产品。",
	Web: "网页端",
	Android: "安卓端",
	"Saving...": "保存中…",
	Prompt: "提问",
	"GEO Score": "综合评分",
	Sentiment: "情感倾向",
	Visibility: "可见度",
	Position: "排名",
	"Sent.": "情感",
	"Vis.": "可见度",
	"Pos.": "排名",
	"This dialog shows AI model responses for the selected prompt.":
		"此窗口展示所选提问的人工智能平台回答。",
	"Analysis in progress...": "正在分析…",
	"No responses match your filters": "没有符合筛选条件的回答",
	"Try adjusting the selected model or time range to see available responses.":
		"请调整所选平台或时间范围，查看已有回答。",
	"Configure Prompts": "配置提问",
	"No prompts yet.": "暂无提问。",
	"Add some on the Prompts page": "前往提问库添加提问",
	"to get started.": "即可开始。",
	"Changes apply to the next manual run immediately. Save them to reuse the same selection later.":
		"修改会立即应用于下一次手动运行。保存后，后续运行可复用此配置。",
	"Self-host": "自行部署",
	"Recurring schedule": "定期运行计划",
	"Active:": "当前启用：",
	"Export Data": "导出数据",
	"Export All Data": "导出全部数据",
	"Export Dashboard, Prompts, and Sources data together in one file.":
		"将总览、提问和信源数据一起导出到一个文件。",
	"Export All JSON": "导出全部数据（JSON）",
	"Export All CSV": "导出全部数据（CSV）",
	"Delete Account": "删除账户",
	"Permanently delete your account, all your workspaces, and all associated data. This cannot be undone.":
		"永久删除账户、所有工作区及关联数据。此操作无法撤销。",
	"Type your email": "请输入您的邮箱",
	"to confirm": "以确认",
	Error: "错误",
	"Open a workspace to inspect source influence.":
		"打开工作区，查看信源影响力。",
	"Sources Are Unavailable": "信源数据暂不可用",
	"We couldn’t load citation data right now.": "暂时无法加载引用数据。",
	"See Who Shapes the Answer": "查看哪些信源影响回答",
	"Run prompts to reveal which domains and URLs AI models keep citing.":
		"运行提问，查看人工智能平台持续引用的网站和页面。",
	"Run prompts": "运行提问",
	"Provider Access": "平台访问授权",
	"Add a new brand workspace to this organization.":
		"为此组织添加新的品牌工作区。",
	"Used as the tracked brand name in analysis.": "用作分析时追踪的品牌名称。",
	Slug: "工作区标识",
	"Used for source matching and brand visibility tracking.":
		"用于匹配信源和追踪品牌可见度。",
	"Enter a workspace code shared by your team.":
		"请输入团队分享的工作区邀请码。",
	Join: "加入",
	"Workspace Code": "工作区邀请码",
	"Use the code shared by your team to join the right workspace.":
		"使用团队分享的邀请码加入对应工作区。",
	"Select a workspace in": "选择工作区，请前往",
	Competitor: "竞品",
	Mentions: "提及次数",
	You: "本品牌",
	Close: "关闭",
	"Stop run": "停止运行",
	Sidebar: "侧边栏",
	"Displays the mobile sidebar.": "显示移动端侧边栏。",
	"Toggle Sidebar": "切换侧边栏",
	"All time": "全部时间",
	"Last 7 days": "最近7天",
	"Last 14 days": "最近14天",
	"Last 30 days": "最近30天",
	"Time range": "时间范围",
	"Failed to copy to clipboard.": "复制失败。",
	"Please enter an email address.": "请输入邮箱地址。",
	"User not found. Share your workspace code so they can join after signing up.":
		"未找到该用户。请分享工作区邀请码，方便对方注册后加入。",
	"This user is already a workspace member.": "该用户已是工作区成员。",
	"Member added to workspace!": "已添加工作区成员。",
	"Failed to add member to workspace.": "添加工作区成员失败。",
	"Member removed from workspace.": "已移除工作区成员。",
	"Failed to remove member.": "移除成员失败。",
	"Please enter both brand name and brand domain.":
		"请输入品牌名称和品牌域名。",
	"Changing brand details will erase all analyzed data for this workspace and require re-analysis. Prompt responses will remain intact. Continue?":
		"修改品牌信息将清空工作区分析数据，需要重新分析。原始回答会保留。是否继续？",
	"Brand details updated. Previous analysis was cleared and will be regenerated on next analysis run.":
		"品牌信息已更新。原分析数据已清空，将在下次分析时重新生成。",
	"Workspace details updated.": "工作区信息已更新。",
	"Failed to update workspace details.": "更新工作区信息失败。",
	"Please enter an organization name.": "请输入组织名称。",
	"Organization name updated.": "组织名称已更新。",
	"Only workspace owners can update organization name.":
		"仅工作区所有者可以修改组织名称。",
	"Cancel editing workspace": "取消编辑工作区",
	"Edit workspace": "编辑工作区",
	"Cancel editing organization": "取消编辑组织",
	"Edit organization": "编辑组织",
	"First Teammate": "首位团队成员",
	"Workspace ID is undefined.": "尚未选择工作区。",
	"Saved.": "已保存。",
	"Failed to save prompts": "保存提问失败",
	"This prompt already exists.": "该提问已存在。",
	"All prompts already exist.": "所有提问均已存在。",
	"No AI providers are available. Connect a provider first.":
		"暂无可用平台，请先连接平台。",
	"Loading Prompts": "正在加载提问",
	"Pulling your prompt library into place.": "正在加载您的提问库。",
	"Open a workspace to add and track prompts.": "打开工作区以添加和追踪提问。",
	"Prompts Are Unavailable": "提问暂不可用",
	"We couldn’t load your prompts right now.": "暂时无法加载您的提问。",
	"Edit Prompt": "编辑提问",
	"Add Prompt": "添加提问",
	"Choose execution surfaces": "选择运行端",
	"Run selected": "运行所选提问",
	"Prompt Performance Export": "提问表现报告",
	"Revise prompts where brand is not mentioned.": "优化尚未提及品牌的提问。",
	"Total Prompts": "提问总数",
	"Analyzed Prompts": "已分析提问",
	"Unanalyzed Prompts": "未分析提问",
	"Avg GEO Score": "平均综合评分",
	"Avg Sentiment": "平均情感倾向",
	"Avg Visibility": "平均可见度",
	"Avg Position": "平均排名",
	"Prompts are read-only; click Details to view responses.":
		"提问为只读；点击详情查看回答。",
	"Drag the handle to reorder; select prompts to run them; click Details for responses.":
		"拖动手柄调整顺序，选择提问进行运行，点击详情查看回答。",
	"Drag to reorder": "拖动排序",
	"No responses yet": "暂无回答",
	"Brand not mentioned in this prompt": "此提问尚未提及品牌",
	"No data available": "暂无数据",
	"View details": "查看详情",
	"Show less": "收起",
	"View full response": "查看完整回答",
	"Email does not match. Please type your email to confirm.":
		"邮箱不匹配，请输入您的邮箱以确认。",
	"Your account has been deleted.": "您的账户已删除。",
	"Failed to delete account.": "删除账户失败。",
	"Permanently delete account": "永久删除账户",
	"Workspace AI Visibility Export": "工作区人工智能可见度报告",
	"Please fill all mandatory fields.": "请填写所有必填项。",
	"Workspace created!": "工作区已创建。",
	"Failed to create workspace.": "创建工作区失败。",
	"Please enter a workspace code.": "请输入工作区邀请码。",
	"Unable to join workspace.": "无法加入工作区。",
	"Queued: waiting to start": "已排队，等待开始",
	"Canceling prompts…": "正在停止提问…",
	"Running prompts, please wait…": "正在运行提问，请稍候…",
	"Responses saved.": "回答已保存。",
	"Stopped at your request.": "已按您的要求停止。",
	"This provider needs another attempt.": "此平台运行失败，请重试。",
	"All Models": "全平台",
	"All prompts": "全部提问",
	"All surfaces": "全部运行端",
	"All devices": "全部设备",
	"Execution surface": "运行端",
	"Loading prompt": "正在加载提问",
	"Source signals you'll uncover": "可查看的信源指标",
	"Top cited domains": "主要引用网站",
	"Most referenced URLs": "高频引用页面",
	"Cited text by provider": "各平台引用原文",
	"Source Analysis": "引用来源分析",
	"See which media sources AI platforms cite and how they shape brand answers.":
		"查看人工智能平台引用的媒体信源及其对品牌回答的影响。",
	"Draft PR article": "撰写新闻稿",
	"Sources Intelligence Export": "信源分析报告",
	"All prompts (overview)": "全部提问（总览）",
	"Top Domain Share": "首位信源引用占比",
	"Avg Citations Per URL": "每页平均引用次数",
	"Top Domain": "首位信源",
	"Source Concentration Risk": "信源集中度风险",
	"If you are the sole owner of any organization, that organization and all its workspaces will be permanently deleted along with your account.":
		"如果您是某组织的唯一所有者，该组织及其所有工作区将随账户一并永久删除。",
	"Sign in to any provider below on this machine. Close each provider window after the login finishes. Saved sessions stay local until you choose to upload them.":
		"请在此设备上登录下方任一平台，登录完成后关闭对应窗口。保存的登录状态会保留在本地，直到您选择上传。",
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
