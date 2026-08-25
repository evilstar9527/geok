import type { Provider } from "@oneglanse/types";
import { AI_OVERVIEW_RAW_SOURCES_DOM_EXTRACTOR } from "../ai-overview/lib/extractSources.js";
import { CHATGPT_RAW_SOURCES_DOM_EXTRACTOR } from "../chatgpt/lib/extractSources.js";
import { CLAUDE_RAW_SOURCES_DOM_EXTRACTOR } from "../claude/lib/extractSources.js";
import { DEEPSEEK_RAW_SOURCES_DOM_EXTRACTOR } from "../deepseek/lib/extractSources.js";
import { DOUBAO_RAW_SOURCES_DOM_EXTRACTOR } from "../doubao/lib/extractSources.js";
import { GEMINI_RAW_SOURCES_DOM_EXTRACTOR } from "../gemini/lib/extractSources.js";
import { KIMI_RAW_SOURCES_DOM_EXTRACTOR } from "../kimi/lib/extractSources.js";
import { PERPLEXITY_RAW_SOURCES_DOM_EXTRACTOR } from "../perplexity/lib/extractSources.js";
import { YUANBAO_RAW_SOURCES_DOM_EXTRACTOR } from "../yuanbao/lib/extractSources.js";

export const PROVIDER_RAW_SOURCES_DOM_EXTRACTORS: Partial<
	Record<Provider, string>
> = {
	chatgpt: CHATGPT_RAW_SOURCES_DOM_EXTRACTOR,
	perplexity: PERPLEXITY_RAW_SOURCES_DOM_EXTRACTOR,
	gemini: GEMINI_RAW_SOURCES_DOM_EXTRACTOR,
	claude: CLAUDE_RAW_SOURCES_DOM_EXTRACTOR,
	"ai-overview": AI_OVERVIEW_RAW_SOURCES_DOM_EXTRACTOR,
	doubao: DOUBAO_RAW_SOURCES_DOM_EXTRACTOR,
	deepseek: DEEPSEEK_RAW_SOURCES_DOM_EXTRACTOR,
	kimi: KIMI_RAW_SOURCES_DOM_EXTRACTOR,
	yuanbao: YUANBAO_RAW_SOURCES_DOM_EXTRACTOR,
};
