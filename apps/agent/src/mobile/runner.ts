import type {
	AskPromptResult,
	DeviceConnection,
	DeviceConnectionSecret,
	DeviceDiagnosticResult,
	MobileProvider,
	PromptPayload,
} from "@oneglanse/types";
import { evaluateExposure } from "@oneglanse/utils";
import { MOBILE_ADAPTERS } from "./adapters.js";
import { AppiumClient } from "./appiumClient.js";

const RESPONSE_TIMEOUT_MS = Number(
	process.env.MOBILE_RESPONSE_TIMEOUT_MS ?? 180_000,
);

type SaveScreenshot = (args: {
	workspaceId: string;
	runId: string;
	promptId: string;
	provider: string;
	deviceId: string;
	kind: "success" | "failure";
	base64Png: string;
}) => Promise<string>;

const defaultSaveScreenshot: SaveScreenshot = async (args) => {
	const { saveDeviceScreenshot } = await import("@oneglanse/services");
	return saveDeviceScreenshot(args);
};

function capabilities(args: {
	device: DeviceConnection;
	secret: DeviceConnectionSecret;
	provider: MobileProvider;
}): Record<string, unknown> {
	const adapter = MOBILE_ADAPTERS[args.provider];
	return {
		platformName: "Android",
		"appium:automationName": "UiAutomator2",
		"appium:udid": args.device.serial,
		"appium:deviceName": args.device.name,
		"appium:appPackage": adapter.appPackage,
		"appium:newCommandTimeout": 900,
		...(args.secret.capabilities ?? {}),
		// Login state must always survive a run, even if arbitrary cloud
		// capabilities supplied by an owner request a reset.
		"appium:noReset": true,
		"appium:fullReset": false,
	};
}

function containsAny(value: string, markers: string[]): boolean {
	return markers.some((marker) => value.includes(marker));
}

async function extractResponse(
	client: AppiumClient,
	provider: MobileProvider,
): Promise<string> {
	const adapter = MOBILE_ADAPTERS[provider];
	const copyElements = (
		await Promise.all(
			adapter.copyResponse.map((selector) => client.findElements(selector)),
		)
	).flat();
	const copyButton = copyElements.at(-1);
	if (copyButton) {
		await client.click(copyButton).catch(() => null);
		const copied = await client.clipboard().catch(() => "");
		if (copied.trim()) return copied.trim();
	}

	const responseElements = (
		await Promise.all(
			adapter.responseText.map((selector) => client.findElements(selector)),
		)
	).flat();
	const texts = await Promise.all(
		responseElements.map((element) => client.text(element).catch(() => "")),
	);
	return (
		texts
			.filter((value) => value.trim())
			.at(-1)
			?.trim() ?? ""
	);
}

async function waitForResponse(
	client: AppiumClient,
	provider: MobileProvider,
	signal?: AbortSignal,
	pollIntervalMs = 2_000,
	timeoutMs = RESPONSE_TIMEOUT_MS,
): Promise<string> {
	const adapter = MOBILE_ADAPTERS[provider];
	const deadline = Date.now() + timeoutMs;
	let last = "";
	let stable = 0;
	while (Date.now() < deadline) {
		if (signal?.aborted) throw new Error("Mobile prompt run cancelled.");
		const source = await client.source();
		if (containsAny(source, adapter.loginMarkers)) {
			throw new Error("login_required");
		}
		if (!containsAny(source, adapter.generatingMarkers)) {
			const response = await extractResponse(client, provider);
			if (response && response === last) stable += 1;
			else stable = 0;
			last = response;
			if (last && stable >= 1) return last;
		}
		await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
	}
	throw new Error("Timed out waiting for the mobile response.");
}

async function runPrompt(args: {
	client: AppiumClient;
	provider: MobileProvider;
	prompt: string;
	appPackage: string;
	signal?: AbortSignal;
	pollIntervalMs?: number;
	responseTimeoutMs?: number;
}): Promise<string> {
	const adapter = MOBILE_ADAPTERS[args.provider];
	await args.client
		.execute("mobile: terminateApp", { appId: args.appPackage })
		.catch(() => null);
	await args.client.execute("mobile: activateApp", { appId: args.appPackage });

	const source = await args.client.source();
	if (containsAny(source, adapter.loginMarkers))
		throw new Error("login_required");
	const newConversation = await args.client.findFirst(adapter.newConversation);
	if (!newConversation)
		throw new Error(
			"New conversation control was not found in the Android app.",
		);
	await args.client.click(newConversation);
	await args.client.setClipboard("").catch(() => null);
	const input = await args.client.findFirst(adapter.promptInput);
	if (!input) throw new Error("Prompt input was not found in the Android app.");
	await args.client.setValue(input, args.prompt);
	const send = await args.client.findFirst(adapter.sendButton);
	if (!send) throw new Error("Send button was not found in the Android app.");
	await args.client.click(send);
	return waitForResponse(
		args.client,
		args.provider,
		args.signal,
		args.pollIntervalMs,
		args.responseTimeoutMs,
	);
}

export async function runMobileProviderBatch(args: {
	device: DeviceConnection;
	secret: DeviceConnectionSecret;
	provider: MobileProvider;
	payload: PromptPayload;
	runId: string;
	exposureTerms: string[];
	signal?: AbortSignal;
	onProgress?: (count: number) => Promise<void>;
	onSessionReady?: (close: () => Promise<void>) => void;
	onBatchStarted?: () => void;
	pollIntervalMs?: number;
	responseTimeoutMs?: number;
	saveScreenshot?: SaveScreenshot;
	markLoginRequired?: () => Promise<void>;
}): Promise<AskPromptResult[]> {
	const client = new AppiumClient(args.secret.appiumUrl, args.secret.headers);
	const results: AskPromptResult[] = [];
	const sessionCapabilities = capabilities({
		device: args.device,
		secret: args.secret,
		provider: args.provider,
	});
	const appPackage = String(
		sessionCapabilities["appium:appPackage"] ??
			MOBILE_ADAPTERS[args.provider].appPackage,
	);
	const configuredAppVersion =
		typeof sessionCapabilities["appium:appVersion"] === "string"
			? sessionCapabilities["appium:appVersion"]
			: null;
	const persistScreenshot = args.saveScreenshot ?? defaultSaveScreenshot;
	try {
		await client.createSession(sessionCapabilities);
		args.onSessionReady?.(() => client.close());
		args.onBatchStarted?.();
		for (const prompt of args.payload.prompts) {
			let response = "";
			let lastError: unknown;
			for (let attempt = 0; attempt < 2; attempt += 1) {
				try {
					response = await runPrompt({
						client,
						provider: args.provider,
						prompt: prompt.prompt,
						appPackage,
						signal: args.signal,
						pollIntervalMs: args.pollIntervalMs,
						responseTimeoutMs: args.responseTimeoutMs,
					});
					break;
				} catch (error) {
					lastError = error;
					if (error instanceof Error && error.message === "login_required") {
						const loginScreenshot = await client.screenshot().catch(() => "");
						if (loginScreenshot) {
							await persistScreenshot({
								workspaceId: args.payload.workspace_id,
								runId: args.runId,
								promptId: prompt.id,
								provider: args.provider,
								deviceId: args.device.id,
								kind: "failure",
								base64Png: loginScreenshot,
							});
						}
						await (args.markLoginRequired
							? args.markLoginRequired()
							: import("@oneglanse/services").then(({ updateDeviceHealth }) =>
									updateDeviceHealth({
										id: args.device.id,
										status: "login_required",
										lastError: "Platform login is required.",
									}),
								));
						throw error;
					}
				}
			}
			if (!response) {
				const screenshot = await client.screenshot().catch(() => "");
				const artifactId = screenshot
					? await persistScreenshot({
							workspaceId: args.payload.workspace_id,
							runId: args.runId,
							promptId: prompt.id,
							provider: args.provider,
							deviceId: args.device.id,
							kind: "failure",
							base64Png: screenshot,
						})
					: null;
				if (args.signal?.aborted) {
					throw lastError ?? new Error("Mobile prompt run cancelled.");
				}
				results.push({
					userId: args.payload.user_id,
					workspaceId: args.payload.workspace_id,
					promptId: prompt.id,
					prompt: prompt.prompt,
					response: "",
					sources: [],
					collection: {
						runId: args.runId,
						surface: "android_app",
						deviceId: args.device.id,
						deviceName: args.device.name,
						appVersion: configuredAppVersion,
						appiumVersion: args.device.appiumVersion,
						cacheResetStatus: "skipped_unsupported",
						exposureEvaluated: false,
						exposureTerms: args.exposureTerms,
						exposureMatches: [],
						screenshotArtifactId: artifactId,
						status: "failed",
						failureReason:
							lastError instanceof Error
								? lastError.message
								: "Mobile response extraction failed.",
					},
				});
				await args.onProgress?.(results.length);
				continue;
			}
			const exposure = evaluateExposure(response, args.exposureTerms);
			const screenshot = await client.screenshot().catch(() => "");
			const artifactId = screenshot
				? await persistScreenshot({
						workspaceId: args.payload.workspace_id,
						runId: args.runId,
						promptId: prompt.id,
						provider: args.provider,
						deviceId: args.device.id,
						kind: "success",
						base64Png: screenshot,
					})
				: null;
			results.push({
				userId: args.payload.user_id,
				workspaceId: args.payload.workspace_id,
				promptId: prompt.id,
				prompt: prompt.prompt,
				response,
				sources: [],
				collection: {
					runId: args.runId,
					surface: "android_app",
					deviceId: args.device.id,
					deviceName: args.device.name,
					appVersion: configuredAppVersion,
					appiumVersion: args.device.appiumVersion,
					cacheResetStatus: "skipped_unsupported",
					exposureEvaluated: exposure.evaluated,
					exposureTerms: exposure.terms,
					exposureMatches: exposure.matches,
					screenshotArtifactId: artifactId,
					status: "success",
					failureReason: null,
				},
			});
			await args.onProgress?.(results.length);
		}
		return results;
	} finally {
		await client.close();
	}
}

export async function probeAppiumDevice(args: {
	device: DeviceConnection;
	secret: DeviceConnectionSecret;
}): Promise<Record<string, unknown>> {
	const client = new AppiumClient(args.secret.appiumUrl, args.secret.headers);
	return client.status();
}

export async function diagnoseAppiumDevice(args: {
	device: DeviceConnection;
	secret: DeviceConnectionSecret;
}): Promise<DeviceDiagnosticResult> {
	const client = new AppiumClient(args.secret.appiumUrl, args.secret.headers);
	try {
		const status = await client.status();
		const build = status.build as { version?: string } | undefined;
		const platformLogin: DeviceDiagnosticResult["platformLogin"] = {};
		for (const provider of args.device.supportedProviders) {
			try {
				await client.createSession(
					capabilities({ device: args.device, secret: args.secret, provider }),
				);
				const source = await client.source();
				platformLogin[provider] = containsAny(
					source,
					MOBILE_ADAPTERS[provider].loginMarkers,
				)
					? "login_required"
					: "ready";
			} catch {
				platformLogin[provider] = "unsupported";
			} finally {
				await client.close();
			}
		}
		const hasLoginFailure =
			Object.values(platformLogin).includes("login_required");
		const allUnsupported =
			Object.keys(platformLogin).length > 0 &&
			Object.values(platformLogin).every((value) => value === "unsupported");
		return {
			status: allUnsupported
				? "unsupported"
				: hasLoginFailure
					? "login_required"
					: "ready",
			model: args.device.model,
			androidVersion: args.device.androidVersion,
			appiumVersion: build?.version ?? args.device.appiumVersion,
			platformLogin,
			error: null,
		};
	} catch (error) {
		return {
			status: "offline",
			model: args.device.model,
			androidVersion: args.device.androidVersion,
			appiumVersion: args.device.appiumVersion,
			platformLogin: {},
			error: error instanceof Error ? error.message : "Device test failed.",
		};
	} finally {
		await client.close();
	}
}
