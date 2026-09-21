import type { Metadata } from "next";

// Browsers keep their own long-lived favicon cache that ignores Cache-Control, so
// the icon URL carries a version query — bump it whenever the logo changes.
const logoUrl = "/logo.png?v=bee-transparent-20260921";
const logoDarkUrl = "/logo-dark.png?v=bee-transparent-20260921";

export const appIcons: Metadata["icons"] = {
	icon: [
		{
			url: logoUrl,
			media: "(prefers-color-scheme: light)",
			type: "image/png",
		},
		{
			url: logoDarkUrl,
			media: "(prefers-color-scheme: dark)",
			type: "image/png",
		},
	],
	shortcut: [
		{
			url: logoUrl,
			type: "image/png",
		},
	],
	apple: [
		{
			url: logoUrl,
			type: "image/png",
		},
	],
};
