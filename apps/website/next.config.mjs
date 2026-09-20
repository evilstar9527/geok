import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
export default {
	outputFileTracingRoot: fileURLToPath(new URL("../../", import.meta.url)),
	basePath: process.env.NEXT_PUBLIC_WEBSITE_BASE_PATH || "",
	output: "export",
	trailingSlash: true,
	images: { unoptimized: true },
};
