import { spawnSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const websiteRoot = fileURLToPath(new URL("../", import.meta.url));
const result = spawnSync("pnpm", ["exec", "next", "build"], {
	cwd: websiteRoot,
	env: { ...process.env, NEXT_PUBLIC_WEBSITE_BASE_PATH: "/official-site" },
	stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

// Copy only after a successful build; retain the previous preview on failure.
const target = new URL("../../web/public/official-site/", import.meta.url);
rmSync(target, { recursive: true, force: true });
cpSync(new URL("../out/", import.meta.url), target, { recursive: true });
