import type { MobileProvider } from "@oneglanse/types";
import type { AppiumSelector } from "./appiumClient.js";

export interface MobileProviderAdapter {
	provider: MobileProvider;
	displayName: string;
	appPackage: string;
	newConversation: AppiumSelector[];
	promptInput: AppiumSelector[];
	sendButton: AppiumSelector[];
	copyResponse: AppiumSelector[];
	responseText: AppiumSelector[];
	loginMarkers: string[];
	generatingMarkers: string[];
}

const xpath = (value: string): AppiumSelector => ({ using: "xpath", value });
const id = (value: string): AppiumSelector => ({ using: "id", value });
const accessibilityId = (value: string): AppiumSelector => ({
	using: "accessibility id",
	value,
});

function common(args: {
	provider: MobileProvider;
	displayName: string;
	appPackage: string;
	inputIds?: string[];
}): MobileProviderAdapter {
	return {
		...args,
		newConversation: [
			accessibilityId("新对话"),
			accessibilityId("新建对话"),
			xpath(
				"//*[@content-desc='新对话' or @text='新对话' or @text='新建对话']",
			),
			xpath(
				"//*[contains(@content-desc,'新建') or contains(@content-desc,'新对话')]",
			),
		],
		promptInput: [
			...(args.inputIds ?? []).map(id),
			xpath("//android.widget.EditText"),
			xpath("//*[@class='android.widget.EditText']"),
		],
		sendButton: [
			accessibilityId("发送"),
			xpath("//*[@content-desc='发送' or @text='发送']"),
			xpath("//*[contains(@content-desc,'发送')]"),
		],
		copyResponse: [
			accessibilityId("复制"),
			xpath("//*[@content-desc='复制' or @text='复制']"),
			xpath("//*[contains(@content-desc,'复制')]"),
		],
		responseText: [
			id("markdown-content"),
			xpath("//*[@resource-id='markdown-content']"),
			xpath(
				"//*[contains(@resource-id,'message') or contains(@resource-id,'answer')]",
			),
		],
		loginMarkers: ["手机号登录", "验证码登录", "扫码登录", "登录后继续"],
		generatingMarkers: ["停止生成", "正在思考", "思考中", "生成中"],
	};
}

export const MOBILE_ADAPTERS: Record<MobileProvider, MobileProviderAdapter> = {
	doubao: common({
		provider: "doubao",
		displayName: "豆包",
		appPackage: "com.larus.nova",
	}),
	deepseek: common({
		provider: "deepseek",
		displayName: "DeepSeek",
		appPackage: "com.deepseek.chat",
	}),
	kimi: common({
		provider: "kimi",
		displayName: "Kimi",
		appPackage: "com.moonshot.kimichat",
	}),
	yuanbao: common({
		provider: "yuanbao",
		displayName: "元宝",
		appPackage: "com.tencent.hunyuan.app.chat",
	}),
	qianwen: common({
		provider: "qianwen",
		displayName: "千问",
		appPackage: "com.aliyun.tongyi",
	}),
	diandian: common({
		provider: "diandian",
		displayName: "点点",
		appPackage: "com.liveverse.diandian",
	}),
};
