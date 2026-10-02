import type { Metadata } from "next";

// Browsers keep their own long-lived favicon cache that ignores Cache-Control, so
// the icon URL carries a version query — bump it whenever the logo changes.
const logoUrl = "/brand-symbol.svg?v=20261002";

export const appIcons: Metadata["icons"] = {
	icon: [
		{
			url: logoUrl,
			type: "image/svg+xml",
		},
	],
	shortcut: [
		{
			url: logoUrl,
			type: "image/svg+xml",
		},
	],
	apple: [
		{
			url: "/brand-logo.jpg?v=20261002",
			type: "image/jpeg",
		},
	],
};
