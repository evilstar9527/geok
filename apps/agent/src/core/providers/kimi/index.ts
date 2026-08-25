import { extractAssistantMarkdown } from "../../../lib/input/markdown/toMarkdown.js";
import { waitForAssistantToFinish } from "../../../lib/input/response/waitForFinish.js";
import type { ProviderConfig } from "../types.js";
import { extractSourcesFromKimi } from "./lib/extractSources.js";
import {
	KIMI_URL,
	kimiPostNavigationHook,
	resetKimiPage,
} from "./lib/pageLifecycle.js";

export const kimiConfig: ProviderConfig = {
	url: KIMI_URL,
	label: "Kimi",
	displayName: "Kimi",
	submitOrder: ["enter", "native"],
	waitForResponse: (page) => waitForAssistantToFinish(page, "kimi"),
	extractResponse: (page) => extractAssistantMarkdown(page, "kimi"),
	postNavigationHook: kimiPostNavigationHook,
	beforeRetryHook: resetKimiPage,
	betweenPromptsHook: resetKimiPage,
	extractSources: extractSourcesFromKimi,
};
