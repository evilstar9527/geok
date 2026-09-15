const MAX_ACTIVE_ANALYSES = 2;
const slotWaiters: Array<() => void> = [];
const scopeTails = new Map<string, Promise<void>>();
let activeAnalyses = 0;

async function acquireSlot(): Promise<void> {
	if (activeAnalyses < MAX_ACTIVE_ANALYSES) {
		activeAnalyses++;
		return;
	}
	await new Promise<void>((resolve) => slotWaiters.push(resolve));
}

function releaseSlot(): void {
	const next = slotWaiters.shift();
	if (next) next();
	else activeAnalyses--;
}

export function runWithAnalysisGate(
	scope: string,
	task: () => Promise<void>,
): Promise<void> {
	const previous = scopeTails.get(scope) ?? Promise.resolve();
	const current = previous
		.catch(() => {})
		.then(async () => {
			await acquireSlot();
			try {
				await task();
			} finally {
				releaseSlot();
			}
		});
	// Same-scope requests wait outside the global slots. Do not drop them: new
	// responses may have arrived while the preceding analysis was running.
	scopeTails.set(scope, current);
	const clear = () => {
		if (scopeTails.get(scope) === current) scopeTails.delete(scope);
	};
	void current.then(clear, clear);
	return current;
}
