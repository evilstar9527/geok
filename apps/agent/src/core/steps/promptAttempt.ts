import type { Provider } from "@oneglanse/types";

export function usesConfirmedSubmission(provider: Provider): boolean {
	return provider === "qianwen" || provider === "diandian";
}

export type PromptProgress = {
	submitted: boolean;
	uncertain: boolean;
	response?: string;
};

// A deadline invalidates this attempt but never releases an action still in
// flight to race a retry. Native browser operations retain their own timeouts.
export class PromptAttempt {
	private readonly controller = new AbortController();

	constructor(private readonly signal?: AbortSignal) {}

	check(): void {
		this.signal?.throwIfAborted();
		this.controller.signal.throwIfAborted();
	}

	async run<T>(
		label: string,
		fn: () => Promise<T>,
		timeoutMs: number,
	): Promise<T> {
		this.check();
		const timer = setTimeout(() => {
			this.controller.abort(
				new Error(`${label} timed out after ${timeoutMs}ms`),
			);
		}, timeoutMs);
		try {
			const result = await fn();
			this.check();
			return result;
		} finally {
			clearTimeout(timer);
		}
	}
}
