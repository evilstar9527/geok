import { ExternalServiceError } from "@oneglanse/errors";

const ELEMENT_KEY = "element-6066-11e4-a52e-4f735466cecf";

export type AppiumSelector = { using: string; value: string };
type AppiumElement = { [ELEMENT_KEY]?: string; ELEMENT?: string };

function joinUrl(baseUrl: string, pathname: string): string {
	return `${baseUrl.replace(/\/$/, "")}/${pathname.replace(/^\//, "")}`;
}

function redactAppiumMessage(value: string): string {
	return value
		.replace(/https?:\/\/[^\s"']+/gi, "[redacted-url]")
		.replace(/bearer\s+[^\s"']+/gi, "Bearer [redacted]")
		.replace(
			/(authorization|token|api[_-]?key|password)(["']?\s*[:=]\s*["']?)[^\s,"'}]+/gi,
			"$1$2[redacted]",
		);
}

export class AppiumClient {
	private sessionId: string | null = null;

	constructor(
		private readonly baseUrl: string,
		private readonly headers: Record<string, string> = {},
	) {}

	private async request<T>(
		method: string,
		pathname: string,
		body?: unknown,
	): Promise<T> {
		const response = await fetch(joinUrl(this.baseUrl, pathname), {
			method,
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...this.headers,
			},
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: AbortSignal.timeout(60_000),
		});
		const payload = (await response.json().catch(() => null)) as {
			value?: T | { error?: string; message?: string };
			sessionId?: string;
		} | null;
		if (!response.ok) {
			const value = payload?.value as { message?: string } | undefined;
			throw new ExternalServiceError(
				"appium",
				redactAppiumMessage(
					value?.message ?? `Appium request failed (${response.status})`,
				),
				502,
			);
		}
		return payload?.value as T;
	}

	async status(): Promise<Record<string, unknown>> {
		return this.request("GET", "/status");
	}

	async createSession(capabilities: Record<string, unknown>): Promise<void> {
		const response = await fetch(joinUrl(this.baseUrl, "/session"), {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...this.headers,
			},
			body: JSON.stringify({
				capabilities: { alwaysMatch: capabilities, firstMatch: [{}] },
			}),
			signal: AbortSignal.timeout(120_000),
		});
		const payload = (await response.json().catch(() => null)) as {
			value?: { sessionId?: string; error?: string; message?: string };
			sessionId?: string;
		} | null;
		const id = payload?.value?.sessionId ?? payload?.sessionId;
		if (!response.ok || !id) {
			throw new ExternalServiceError(
				"appium",
				redactAppiumMessage(
					payload?.value?.message ?? "Appium did not create a session.",
				),
				502,
			);
		}
		this.sessionId = id;
	}

	private path(suffix: string): string {
		if (!this.sessionId) throw new Error("Appium session is not active.");
		return `/session/${this.sessionId}${suffix}`;
	}

	async close(): Promise<void> {
		if (!this.sessionId) return;
		await this.request("DELETE", this.path("")).catch(() => null);
		this.sessionId = null;
	}

	async source(): Promise<string> {
		return this.request("GET", this.path("/source"));
	}

	async screenshot(): Promise<string> {
		return this.request("GET", this.path("/screenshot"));
	}

	async execute<T>(script: string, args: Record<string, unknown>): Promise<T> {
		return this.request("POST", this.path("/execute/sync"), {
			script,
			args: [args],
		});
	}

	async findElements(selector: AppiumSelector): Promise<string[]> {
		const elements = await this.request<AppiumElement[]>(
			"POST",
			this.path("/elements"),
			selector,
		);
		return (elements ?? [])
			.map((element) => element[ELEMENT_KEY] ?? element.ELEMENT)
			.filter((id): id is string => Boolean(id));
	}

	async findFirst(selectors: AppiumSelector[]): Promise<string | null> {
		for (const selector of selectors) {
			const [element] = await this.findElements(selector).catch(() => []);
			if (element) return element;
		}
		return null;
	}

	async click(elementId: string): Promise<void> {
		await this.request("POST", this.path(`/element/${elementId}/click`), {});
	}

	async setValue(elementId: string, value: string): Promise<void> {
		await this.request("POST", this.path(`/element/${elementId}/value`), {
			text: value,
			value: [...value],
		});
	}

	async text(elementId: string): Promise<string> {
		return this.request("GET", this.path(`/element/${elementId}/text`));
	}

	async clipboard(): Promise<string> {
		const encoded = await this.request<string>(
			"POST",
			this.path("/appium/device/get_clipboard"),
			{ contentType: "plaintext" },
		);
		return Buffer.from(encoded ?? "", "base64").toString("utf8");
	}

	async setClipboard(value: string): Promise<void> {
		await this.request("POST", this.path("/appium/device/set_clipboard"), {
			contentType: "plaintext",
			content: Buffer.from(value, "utf8").toString("base64"),
		});
	}
}
