import { ExternalServiceError } from "@oneglanse/errors";
import type { AskPromptResult, Provider } from "@oneglanse/types";

export class ProviderActionRequiredError extends ExternalServiceError {
	constructor(
		provider: Provider,
		readonly actionRequired: "login" | "verification",
		message: string,
		public partialResults: AskPromptResult[] = [],
	) {
		super(provider, message);
	}

	get userMessage(): string {
		return this.actionRequired === "login"
			? "登录已失效，请在 AI 平台页面重新连接。"
			: "平台要求人工验证，请完成验证后重新连接。";
	}
}
