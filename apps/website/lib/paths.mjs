const basePath = process.env.NEXT_PUBLIC_WEBSITE_BASE_PATH || "";

export const TOOL_URL =
	process.env.NEXT_PUBLIC_TOOL_URL || "https://8.133.177.51:3000/dashboard";

export function sitePath(url) {
	return url.startsWith("/") && !url.startsWith("//")
		? `${basePath}${url}`
		: url;
}
