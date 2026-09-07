import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { env } from "../env.js";
import { AppiumClient } from "./appiumClient.js";

const exec = promisify(execFile);

async function command(name: string, args: string[]) {
	try {
		const result = await exec(name, args, { timeout: 20_000 });
		return { ok: true, output: (result.stdout || result.stderr).trim() };
	} catch (error) {
		return {
			ok: false,
			output: error instanceof Error ? error.message : String(error),
		};
	}
}

const checks = await Promise.all([
	command("adb", ["version"]),
	command("adb", ["devices", "-l"]),
	command("appium", ["--version"]),
	command("appium", ["driver", "list", "--installed"]),
	new AppiumClient(env.LOCAL_APPIUM_URL)
		.status()
		.then((value) => ({ ok: true, output: JSON.stringify(value) }))
		.catch((error) => ({
			ok: false,
			output: error instanceof Error ? error.message : String(error),
		})),
]);

for (const [index, label] of [
	"ADB",
	"ADB devices",
	"Appium",
	"Appium drivers",
	"Appium endpoint",
].entries()) {
	const result = checks[index];
	console.log(
		`${result?.ok ? "✓" : "✗"} ${label}: ${result?.output ?? "unknown"}`,
	);
}

if (checks.some((result) => !result.ok)) process.exitCode = 1;
