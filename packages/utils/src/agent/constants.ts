import type { Provider } from "@oneglanse/types";

export const PROVIDER_NO_OUTPUT_TIMEOUT_MS: Record<Provider, number> = {
	chatgpt: 90_000,
	perplexity: 45_000,
	gemini: 45_000,
	claude: 60_000,
	"ai-overview": 45_000,
	// 豆包/DeepSeek 的联网检索 + 深度思考模式首字延迟明显长于海外产品,
	// 给到 90s 以免把「还在检索」误判成无输出。
	doubao: 90_000,
	deepseek: 90_000,
	kimi: 90_000,
	yuanbao: 90_000,
	qianwen: 90_000,
};

export const PROVIDER_FORCE_EXIT_STABLE_MS: Record<Provider, number> = {
	chatgpt: 45_000,
	perplexity: 30_000,
	gemini: 45_000,
	claude: 45_000,
	"ai-overview": 30_000,
	doubao: 45_000,
	deepseek: 45_000,
	kimi: 45_000,
	yuanbao: 45_000,
	qianwen: 45_000,
};

export const PROVIDER_EDITOR_SELECTORS: Record<Provider, string[]> = {
	chatgpt: [
		"#prompt-textarea",
		'div#prompt-textarea[contenteditable="true"][role="textbox"]',
		'div.ProseMirror[contenteditable="true"][role="textbox"]',
		'div[contenteditable="true"][role="textbox"][aria-multiline="true"][aria-label="Chat with ChatGPT"]',
	],
	perplexity: [
		"#ask-input",
		'div#ask-input[contenteditable="true"][role="textbox"]',
		'div[role="textbox"][data-lexical-editor="true"]',
		'div[contenteditable="true"][role="textbox"][data-lexical-editor="true"]',
	],
	gemini: [
		'div[aria-label="Enter a prompt for Gemini"]',
		'rich-textarea [contenteditable="true"][role="textbox"]',
		'div[contenteditable="true"][role="textbox"][aria-multiline="true"]',
	],
	claude: [
		'[data-testid="chat-input"]',
		'div[data-testid="chat-input"][contenteditable="true"][role="textbox"]',
		'[data-testid="chat-input"][aria-multiline="true"]',
	],
	"ai-overview": [
		'textarea[name="q"][role="combobox"]',
		'textarea[role="combobox"][aria-label="Search"]',
	],
	// 豆包用 tiptap/ProseMirror,DOM 上没有 id 也没有 data-testid,
	// 唯一稳定的锚点是 .tiptap + role=textbox(2026-08 实测)。
	doubao: [
		'div.tiptap.ProseMirror[contenteditable="true"]',
		'div[contenteditable="true"][role="textbox"].tiptap',
		'div[data-testid="chat_input_input"]',
		'div[contenteditable="true"][role="textbox"]',
	],
	// DeepSeek 用原生 textarea,#chat-input 是其长期稳定 id。
	deepseek: [
		"textarea#chat-input",
		'textarea[placeholder*="给 DeepSeek"]',
		'div[contenteditable="true"][role="textbox"]',
		"textarea",
	],
	kimi: [
		'div.chat-input-editor[contenteditable="true"]',
		'textarea[placeholder*="Kimi"]',
		'div[contenteditable="true"][role="textbox"]',
		"textarea",
	],
	yuanbao: [
		'div[contenteditable="true"][role="textbox"]',
		"textarea",
		'div[contenteditable="true"]',
	],
	qianwen: [
		'textarea[placeholder*="输入"]',
		'textarea[placeholder*="千问"]',
		'div[contenteditable="true"][role="textbox"]',
		'div[contenteditable="true"]',
		"textarea",
	],
};

export const PROVIDER_SUBMIT_BTN_SELECTORS: Record<Provider, string[]> = {
	chatgpt: ['button[data-testid="send-button"]'],
	perplexity: ['button[aria-label*="Submit"]'],
	gemini: ['button[aria-label*="Send"]'],
	claude: ['button[aria-label*="Send"]'],
	"ai-overview": [],
	// 两家的发送按钮都没有稳定 aria-label / testid,回车提交更可靠,
	// 因此 provider config 里把 submitOrder 收窄为 ["enter", ...]。
	// 豆包 DOM 无 data-testid,原先的 chat_input_send_button 是死 selector。
	// 提交主路径是回车(submitOrder 里 enter 优先),这里只作 native click 兜底。
	doubao: ['button[aria-label*="发送"]', 'button[class*="send"]'],
	deepseek: [
		'div[role="button"][aria-disabled="false"]._7436101',
		'button[aria-label*="发送"]',
	],
	kimi: [
		'button[aria-label*="发送"]',
		'div[role="button"][aria-disabled="false"]',
	],
	yuanbao: [
		'button[aria-label*="发送"]',
		'div[role="button"][aria-label*="发送"]',
	],
	qianwen: [
		'button[aria-label*="发送"]',
		'button[class*="send"]',
		'div[role="button"][aria-label*="发送"]',
	],
};

export const PROVIDER_MODEL_RESPONSE_SELECTORS: Record<Provider, string[]> = {
	chatgpt: [
		'[data-message-author-role="assistant"]',
		'[data-testid^="conversation-turn"][data-turn="assistant"]',
	],
	perplexity: [
		'div[id^="markdown-content-"]',
		'[id^="markdown-content-"] .prose',
	],
	gemini: ["message-content .markdown"],
	claude: [
		'[data-is-streaming="false"] .standard-markdown',
		".standard-markdown",
	],
	"ai-overview": ['[data-container-id="main-col"]'],
	// 豆包页面上没有任何 data-testid(实测 [data-testid] 全页面 0 个),回答正文
	// 容器是 div.container-<hash>.md-box-root。其中 md-box-root 是语义 class、
	// 跨发版稳定,container-* 是构建哈希、会随前端发版变化,因此只作兜底。
	// [class*="markdown"] 选不中:豆包用的是 md-box-* 命名,不含 markdown 字样。
	doubao: [
		"div.md-box-root",
		'[class*="md-box-root"]',
		'div[class^="container-"][class*="md-box"]',
	],
	// DeepSeek 的 ds-markdown 是回答正文容器,_4f9bf79 是其外层 message wrapper。
	deepseek: [
		"div.ds-markdown",
		"div._4f9bf79 div.ds-markdown",
		'div[class*="ds-markdown"]',
	],
	kimi: ['div[class*="markdown"]', 'div[class*="response"]'],
	yuanbao: [
		'div[class*="markdown"]',
		'div[class*="answer"]',
		'div[class*="response"]',
	],
	qianwen: [
		'div[class*="markdown-body"]',
		'div[class*="markdown"]',
		'div[class*="answer"]',
		'div[class*="response"]',
		'div[class*="message-content"]',
	],
};

export const PROVIDER_RESPONSE_GENERATION_SELECTORS: Record<
	Provider,
	string[]
> = {
	chatgpt: [
		'button[data-testid="stop-button"]',
		'button[aria-label*="stop" i]',
	],
	perplexity: ['button[aria-label*="stop" i]'],
	gemini: ['button[aria-label*="stop" i]'],
	claude: ['button[aria-label*="stop" i]'],
	"ai-overview": [],
	// 生成中指示器。中文 UI 用「停止」而非 stop,英文 selector 匹配不到 ——
	// 漏掉这个会让 waitForFinish 提前认为生成已结束、截断回答。
	// 注意:豆包 DOM 无 data-testid,原先的 chat_input_stop_button 是死 selector。
	doubao: ['button[aria-label*="停止"]', '[class*="stop"]'],
	deepseek: [
		'div[role="button"][aria-label*="停止"]',
		'button[aria-label*="停止"]',
		'[class*="stop"]',
	],
	kimi: ['button[aria-label*="停止"]', '[class*="stop"]'],
	yuanbao: ['button[aria-label*="停止"]', '[class*="stop"]'],
	qianwen: [
		'button[aria-label*="停止"]',
		'button[title*="停止"]',
		'[class*="stop"]',
	],
};

export const RETRYABLE_ERRORS = [
	"ERR_SSL_PROTOCOL_ERROR",
	"ERR_CONNECTION",
	"ERR_TIMED_OUT",
	"ERR_PROXY_CONNECTION_FAILED",
	"Timeout",
];
