import { PROVIDER_LIST, type Provider } from "@oneglanse/types";
import { PROVIDER_DISPLAY } from "../agent/providers.js";

export const modelSelectors: Array<{
	value: Provider | "All Models";
	label: string;
}> = [
	{ value: "All Models", label: "All Models" },
	...PROVIDER_LIST.map((p) => ({
		value: p,
		label: PROVIDER_DISPLAY[p].displayName,
	})),
];
