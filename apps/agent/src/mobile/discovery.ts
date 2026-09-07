import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { DiscoveredAndroidDevice } from "@oneglanse/types";

const execFileAsync = promisify(execFile);

async function adb(args: string[]): Promise<string> {
	const result = await execFileAsync("adb", args, { timeout: 15_000 });
	return result.stdout.trim();
}

export async function discoverLocalAndroidDevices(): Promise<
	DiscoveredAndroidDevice[]
> {
	const output = await adb(["devices", "-l"]);
	const entries = parseAdbDevicesOutput(output);

	return Promise.all(
		entries.map(async ({ serial, status }) => {
			if (status !== "device") {
				return { serial, model: null, androidVersion: null, status };
			}
			const [model, androidVersion] = await Promise.all([
				adb(["-s", serial, "shell", "getprop", "ro.product.model"]).catch(
					() => "",
				),
				adb([
					"-s",
					serial,
					"shell",
					"getprop",
					"ro.build.version.release",
				]).catch(() => ""),
			]);
			return {
				serial,
				model: model || null,
				androidVersion: androidVersion || null,
				status,
			};
		}),
	);
}

export function parseAdbDevicesOutput(
	output: string,
): Array<Pick<DiscoveredAndroidDevice, "serial" | "status">> {
	return output
		.split(/\r?\n/)
		.slice(1)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const [serial, rawStatus] = line.split(/\s+/);
			const status = ["device", "offline", "unauthorized"].includes(
				rawStatus ?? "",
			)
				? (rawStatus as DiscoveredAndroidDevice["status"])
				: "unknown";
			return serial ? { serial, status } : null;
		})
		.filter(
			(entry): entry is Pick<DiscoveredAndroidDevice, "serial" | "status"> =>
				entry !== null,
		);
}
