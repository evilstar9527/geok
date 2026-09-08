import { ProvidersScreen } from "@/components/providers-screen";
import { env } from "@/env";
import { getWorkspace } from "@/lib/workspace/getWorkspace";
import { resolveAppMode } from "@oneglanse/types";

export default async function ProvidersPage() {
	let workspace = null;
	try {
		workspace = await getWorkspace();
	} catch {
		workspace = null;
	}
	const appMode = resolveAppMode(env.NEXT_PUBLIC_ONEGLANSE_APP_MODE);
	const isSelfHost = appMode === "self-host";

	return (
		<ProvidersScreen
			description={isSelfHost ? null : undefined}
			showSetupNotice
			workspaceId={workspace?.id ?? null}
			watchForExternalUpdates={isSelfHost}
		/>
	);
}
