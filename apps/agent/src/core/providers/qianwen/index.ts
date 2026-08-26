import { extractAssistantMarkdown } from "../../../lib/input/markdown/toMarkdown.js";
import { waitForAssistantToFinish } from "../../../lib/input/response/waitForFinish.js";
import type { ProviderConfig } from "../types.js";
import { extractSourcesFromQianwen } from "./lib/extractSources.js";
import {
	QIANWEN_URL,
	qianwenPostNavigationHook,
	resetQianwenPage,
} from "./lib/pageLifecycle.js";

export const qianwenConfig: ProviderConfig = {
	url: QIANWEN_URL,
	label: "千问",
	displayName: "千问",
	// 千问的输入区可能随版本在 textarea 与 contenteditable 间切换，
	// 回车提交比依赖构建哈希类名的发送按钮稳定。
	submitOrder: ["enter", "native"],
	waitForResponse: (page) => waitForAssistantToFinish(page, "qianwen"),
	extractResponse: (page) => extractAssistantMarkdown(page, "qianwen"),
	postNavigationHook: qianwenPostNavigationHook,
	beforeRetryHook: resetQianwenPage,
	betweenPromptsHook: resetQianwenPage,
	extractSources: extractSourcesFromQianwen,
};
