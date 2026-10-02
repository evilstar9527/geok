import { PROVIDER_LIST, type Provider } from "@oneglanse/types";
import { PROVIDER_DISPLAY } from "../agent/providers.js";

const domesticProviders: Provider[] = [
	"doubao",
	"yuanbao",
	"diandian",
	"qianwen",
	"kimi",
	"deepseek",
];

export const DISPLAY_PROVIDER_LIST: Provider[] = [
	...domesticProviders,
	...PROVIDER_LIST.filter((provider) => !domesticProviders.includes(provider)),
];

export const modelSelectors: Array<{
	value: Provider | "All Models";
	label: string;
}> = [
	{ value: "All Models", label: "All Models" },
	...DISPLAY_PROVIDER_LIST.map((p) => ({
		value: p,
		label: PROVIDER_DISPLAY[p].displayName,
	})),
];
