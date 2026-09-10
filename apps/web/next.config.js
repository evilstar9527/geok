/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import path from "node:path";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
	enabled: process.env.ANALYZE === "true",
});

/** @type {import("next").NextConfig} */
const config = {
	output: "standalone",
	outputFileTracingRoot: path.join(process.cwd(), "../../"),
	env: {
		// Pass SKIP_ENV_VALIDATION to the runtime so it's not inlined as undefined
		SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION,
	},
	transpilePackages: [
		"@oneglanse/ui",
		"@oneglanse/utils",
		"@oneglanse/db",
		"@oneglanse/errors",
		"@oneglanse/services",
		"@oneglanse/types",
	],
	logging: {
		incomingRequests: {
			ignore: [/^\/api\//],
		},
	},
	// nginx terminates TLS and proxies here, so these are the only headers the app
	// can set for itself. A Content-Security-Policy is deliberately absent: Next
	// inlines hydration scripts, so a real policy needs a nonce threaded through
	// middleware and a pass against a running build, and shipping a guessed one
	// would break the app rather than harden it.
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					// Ignored over plain HTTP, so it is safe to send unconditionally.
					{ key: "Strict-Transport-Security", value: "max-age=31536000" },
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "SAMEORIGIN" },
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin",
					},
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=()",
					},
				],
			},
		];
	},
	webpack: (config) => {
		// Ensure webpack follows symlinks for workspace packages
		config.resolve.symlinks = true;
		// Ensure webpack resolves modules from node_modules
		config.resolve.modules = [...config.resolve.modules, "node_modules"];
		// Suppress the spurious "Critical dependency: the request of a dependency
		// is an expression" warning from bullmq's child-processor.js. This is a
		// known dynamic-require in bullmq that is never executed in the browser
		// bundle; it does not affect runtime behaviour.
		config.ignoreWarnings = [
			...(config.ignoreWarnings ?? []),
			{ module: /bullmq\/dist\/esm\/classes\/child-processor/ },
		];
		return config;
	},
};

export default withBundleAnalyzer(config);
