import { extractAssistantMarkdown } from "../../../lib/input/markdown/toMarkdown.js";
import { waitForAssistantToFinish } from "../../../lib/input/response/waitForFinish.js";
import type { ProviderConfig } from "../types.js";
import { extractSourcesFromDeepseek } from "./lib/extractSources.js";
import {
	DEEPSEEK_URL,
	deepseekPostNavigationHook,
	resetDeepseekPage,
} from "./lib/pageLifecycle.js";

export const deepseekConfig: ProviderConfig = {
	url: DEEPSEEK_URL,
	label: "DeepSeek",
	displayName: "DeepSeek",
	// 输入区是原生 textarea,回车提交最稳;发送按钮是 div[role=button]
	// 且类名带 hash(构建产物),不适合作为主路径。
	submitOrder: ["enter", "native"],
	waitForResponse: (page) => waitForAssistantToFinish(page, "deepseek"),
	extractResponse: (page) => extractAssistantMarkdown(page, "deepseek"),
	postNavigationHook: deepseekPostNavigationHook,
	beforeRetryHook: resetDeepseekPage,
	betweenPromptsHook: resetDeepseekPage,
	extractSources: extractSourcesFromDeepseek,
};
