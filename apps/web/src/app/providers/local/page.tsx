import { ProvidersScreen } from "@/components/providers-screen";
import { env } from "@/env";
import { resolveAppMode } from "@oneglanse/types";
import { redirect } from "next/navigation";

export default function LocalProvidersPage() {
	if (resolveAppMode(env.NEXT_PUBLIC_ONEGLANSE_APP_MODE) !== "local") {
		redirect("/providers");
	}

	return (
		<ProvidersScreen
			title="平台访问授权"
			description="请在此设备上登录下方任一平台，登录完成后关闭对应窗口。保存的登录状态会保留在本地，直到您选择上传。"
		/>
	);
}
