import { extractAssistantMarkdown } from "../../../lib/input/markdown/toMarkdown.js";
import { waitForAssistantToFinish } from "../../../lib/input/response/waitForFinish.js";
import type { ProviderConfig } from "../types.js";
import { extractSourcesFromYuanbao } from "./lib/extractSources.js";
import {
	YUANBAO_URL,
	yuanbaoAfterSubmitHook,
	yuanbaoPostNavigationHook,
	resetYuanbaoPage,
} from "./lib/pageLifecycle.js";

export const yuanbaoConfig: ProviderConfig = {
	url: YUANBAO_URL,
	label: "元宝",
	displayName: "元宝",
	// 元宝与豆包/DeepSeek 类似,发送按钮没有稳定 aria-label / data-testid,
	// 回车提交在富文本编辑框上更稳定可靠,因此收窄策略顺序,不保留 force / dispatch。
	submitOrder: ["enter", "native"],
	waitForResponse: (page) => waitForAssistantToFinish(page, "yuanbao"),
	extractResponse: (page) => extractAssistantMarkdown(page, "yuanbao"),
	postNavigationHook: yuanbaoPostNavigationHook,
	// 等会话 id 从 local_ 收敛成真实 id 再进提取,详见 pageLifecycle。
	afterSubmitHook: yuanbaoAfterSubmitHook,
	beforeRetryHook: resetYuanbaoPage,
	betweenPromptsHook: resetYuanbaoPage,
	// 元宝把参考来源内联在回答里,没有需要点开的 sources 面板,
	// 所以不用 findSourcesButton / openSourcesPanel。
	extractSources: extractSourcesFromYuanbao,
};
