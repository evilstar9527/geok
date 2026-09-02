import { extractAssistantMarkdown } from "../../../lib/input/markdown/toMarkdown.js";
import { waitForAssistantToFinish } from "../../../lib/input/response/waitForFinish.js";
import type { ProviderConfig } from "../types.js";
import { extractSourcesFromDiandian } from "./lib/extractSources.js";
import {
	DIANDIAN_URL,
	diandianPostNavigationHook,
	resetDiandianPage,
} from "./lib/pageLifecycle.js";

export const diandianConfig: ProviderConfig = {
	url: DIANDIAN_URL,
	label: "点点",
	displayName: "点点",
	// DOM 未实测,输入框/发送按钮的选择器都是通用兜底,回车提交比依赖
	// 未知的发送按钮更稳妥,因此把 native 收窄为兜底而非第一选择。
	submitOrder: ["enter", "native"],
	waitForResponse: (page) => waitForAssistantToFinish(page, "diandian"),
	extractResponse: (page) => extractAssistantMarkdown(page, "diandian"),
	postNavigationHook: diandianPostNavigationHook,
	beforeRetryHook: resetDiandianPage,
	betweenPromptsHook: resetDiandianPage,
	extractSources: extractSourcesFromDiandian,
};
