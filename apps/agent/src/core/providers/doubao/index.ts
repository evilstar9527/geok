import { extractAssistantMarkdown } from "../../../lib/input/markdown/toMarkdown.js";
import { waitForAssistantToFinish } from "../../../lib/input/response/waitForFinish.js";
import type { ProviderConfig } from "../types.js";
import { extractSourcesFromDoubao } from "./lib/extractSources.js";
import {
	DOUBAO_URL,
	doubaoAfterSubmitHook,
	doubaoPostNavigationHook,
	resetDoubaoPage,
} from "./lib/pageLifecycle.js";

export const doubaoConfig: ProviderConfig = {
	url: DOUBAO_URL,
	label: "豆包",
	displayName: "豆包",
	// 豆包的发送按钮没有稳定的 aria-label / data-testid(实测 DOM 上
	// 完全没有 data-testid),native click 找不到目标就会走 force/dispatch
	// 这类更容易被反自动化识别的路径。回车提交在 tiptap 上稳定可靠,
	// 因此收窄策略顺序,不保留 force / dispatch。
	submitOrder: ["enter", "native"],
	waitForResponse: (page) => waitForAssistantToFinish(page, "doubao"),
	extractResponse: (page) => extractAssistantMarkdown(page, "doubao"),
	postNavigationHook: doubaoPostNavigationHook,
	// 等会话 id 从 local_ 收敛成真实 id 再进提取,详见 pageLifecycle。
	afterSubmitHook: doubaoAfterSubmitHook,
	beforeRetryHook: resetDoubaoPage,
	betweenPromptsHook: resetDoubaoPage,
	// 豆包把参考来源内联在回答里,没有需要点开的 sources 面板,
	// 所以不用 findSourcesButton / openSourcesPanel。
	extractSources: extractSourcesFromDoubao,
};
