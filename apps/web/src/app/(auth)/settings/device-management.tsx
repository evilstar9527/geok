"use client";

import { api } from "@/trpc/react";
import type { ExecutionSurface, MobileProvider } from "@oneglanse/types";
import { MOBILE_PROVIDER_LIST } from "@oneglanse/types";
import { Button, Checkbox, Input, Label, Textarea, toast } from "@oneglanse/ui";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const LABELS: Record<MobileProvider, string> = {
	doubao: "豆包",
	deepseek: "DeepSeek",
	kimi: "Kimi",
	yuanbao: "元宝",
	qianwen: "千问",
	diandian: "点点",
};

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "操作失败";
}

export function DeviceManagement({ workspaceId }: { workspaceId: string }) {
	const utils = api.useUtils();
	const devices = api.device.list.useQuery(
		{ workspaceId },
		{ enabled: !!workspaceId },
	);
	const exposure = api.workspace.getExposureSettings.useQuery(
		{ workspaceId },
		{ enabled: !!workspaceId },
	);
	const discover = api.device.discoverLocal.useMutation();
	const create = api.device.create.useMutation();
	const update = api.device.update.useMutation();
	const test = api.device.test.useMutation();
	const remove = api.device.delete.useMutation();
	const saveTerms = api.workspace.setExposureTerms.useMutation();
	const saveSurfaces = api.workspace.setScheduledSurfaces.useMutation();

	const [name, setName] = useState("");
	const [kind, setKind] = useState<"local_adb" | "remote_appium">("local_adb");
	const [serial, setSerial] = useState("");
	const [appiumUrl, setAppiumUrl] = useState("http://127.0.0.1:4723");
	const [headersText, setHeadersText] = useState("{}");
	const [capabilitiesText, setCapabilitiesText] = useState("{}");
	const [providers, setProviders] = useState<MobileProvider[]>([
		...MOBILE_PROVIDER_LIST,
	]);
	const [terms, setTerms] = useState("");
	const [surfaces, setSurfaces] = useState<ExecutionSurface[]>(["web"]);
	const [discovered, setDiscovered] = useState<
		Array<{
			serial: string;
			model: string | null;
			androidVersion: string | null;
		}>
	>([]);

	useEffect(() => {
		if (!exposure.data) return;
		setTerms(exposure.data.exposureTerms.join("\n"));
		setSurfaces(exposure.data.scheduledSurfaces as ExecutionSurface[]);
	}, [exposure.data]);

	const toggleProvider = (provider: MobileProvider) => {
		setProviders((current) =>
			current.includes(provider)
				? current.filter((value) => value !== provider)
				: [...current, provider],
		);
	};

	const handleDiscover = async () => {
		try {
			const result = await discover.mutateAsync({ workspaceId });
			setDiscovered(result);
			toast.success(`发现 ${result.length} 台 Android 设备`);
		} catch (error) {
			toast.error(errorMessage(error));
		}
	};

	const handleCreate = async () => {
		try {
			if (!providers.length) throw new Error("请至少选择一个平台");
			const parsedHeaders = JSON.parse(headersText) as Record<string, string>;
			const parsedCapabilities = JSON.parse(capabilitiesText) as Record<
				string,
				unknown
			>;
			await create.mutateAsync({
				workspaceId,
				name,
				kind,
				serial,
				appiumUrl,
				supportedProviders: providers,
				headers: parsedHeaders,
				capabilities: parsedCapabilities,
			});
			setName("");
			setSerial("");
			await utils.device.list.invalidate({ workspaceId });
			toast.success("设备已添加，连接测试通过后才会参与任务");
		} catch (error) {
			toast.error(errorMessage(error));
		}
	};

	return (
		<div className="space-y-8">
			<section>
				<h2 className="mb-4 text-base font-semibold text-gray-900 sm:text-lg dark:text-gray-100">
					曝光与定时执行
				</h2>
				<div className="space-y-4 rounded-xl border border-gray-200 p-5 dark:border-gray-800">
					<div className="space-y-2">
						<Label htmlFor="exposure-terms">曝光匹配词</Label>
						<Textarea
							id="exposure-terms"
							value={terms}
							onChange={(event) => setTerms(event.target.value)}
							placeholder="每行一个品牌别名、产品名或关键词；品牌名和域名会自动加入"
						/>
					</div>
					<div className="flex gap-5 text-sm">
						{(["web", "android_app"] as const).map((surface) => (
							<label
								key={surface}
								htmlFor={`scheduled-${surface}`}
								className="flex items-center gap-2"
							>
								<Checkbox
									id={`scheduled-${surface}`}
									checked={surfaces.includes(surface)}
									onCheckedChange={() =>
										setSurfaces((current) =>
											current.includes(surface)
												? current.filter((value) => value !== surface)
												: [...current, surface],
										)
									}
								/>
								{surface === "web" ? "Web" : "Android"}
							</label>
						))}
					</div>
					<Button
						onClick={async () => {
							try {
								if (!surfaces.length)
									throw new Error("请至少选择一个定时执行渠道");
								await Promise.all([
									saveTerms.mutateAsync({
										workspaceId,
										exposureTerms: terms
											.split(/[,，\n]/)
											.map((value) => value.trim())
											.filter(Boolean),
									}),
									saveSurfaces.mutateAsync({ workspaceId, surfaces }),
								]);
								toast.success("曝光匹配词和定时执行渠道已保存");
							} catch (error) {
								toast.error(errorMessage(error));
							}
						}}
					>
						保存设置
					</Button>
				</div>
			</section>

			<section>
				<div className="mb-4 flex items-center justify-between gap-3">
					<div>
						<h2 className="text-base font-semibold text-gray-900 sm:text-lg dark:text-gray-100">
							设备管理
						</h2>
						<p className="text-sm text-gray-500">
							设备需预装并人工登录 App；Endpoint、认证头与 capabilities
							会整体加密。
						</p>
					</div>
					<Button
						variant="outline"
						onClick={handleDiscover}
						disabled={discover.isPending}
					>
						{discover.isPending ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<RefreshCw className="mr-2 h-4 w-4" />
						)}
						发现本地设备
					</Button>
				</div>

				{discovered.length > 0 && (
					<div className="mb-4 space-y-2 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
						{discovered.map((device) => (
							<div
								key={device.serial}
								className="flex items-center justify-between text-sm"
							>
								<span>
									{device.model ?? "Android"} · {device.serial} · Android{" "}
									{device.androidVersion ?? "?"}
								</span>
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										setKind("local_adb");
										setSerial(device.serial);
										setName(device.model ?? device.serial);
									}}
								>
									使用
								</Button>
							</div>
						))}
					</div>
				)}

				<div className="space-y-4 rounded-xl border border-gray-200 p-5 dark:border-gray-800">
					<div className="grid gap-3 sm:grid-cols-2">
						<Input
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="设备名称"
						/>
						<select
							className="h-10 rounded-md border bg-transparent px-3 text-sm"
							value={kind}
							onChange={(event) => setKind(event.target.value as typeof kind)}
						>
							<option value="local_adb">本地 ADB 真机</option>
							<option value="remote_appium">远程 Appium 云真机</option>
						</select>
						<Input
							value={serial}
							onChange={(event) => setSerial(event.target.value)}
							placeholder="Android serial / UDID"
						/>
						<Input
							value={appiumUrl}
							onChange={(event) => setAppiumUrl(event.target.value)}
							placeholder="Appium Endpoint"
						/>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<Textarea
							value={headersText}
							onChange={(event) => setHeadersText(event.target.value)}
							placeholder='认证头 JSON，例如 {"Authorization":"Bearer ..."}'
						/>
						<Textarea
							value={capabilitiesText}
							onChange={(event) => setCapabilitiesText(event.target.value)}
							placeholder="Capabilities JSON"
						/>
					</div>
					<div className="flex flex-wrap gap-4 text-sm">
						{MOBILE_PROVIDER_LIST.map((provider) => (
							<label
								key={provider}
								htmlFor={`device-provider-${provider}`}
								className="flex items-center gap-2"
							>
								<Checkbox
									id={`device-provider-${provider}`}
									checked={providers.includes(provider)}
									onCheckedChange={() => toggleProvider(provider)}
								/>
								{LABELS[provider]}
							</label>
						))}
					</div>
					<Button
						onClick={handleCreate}
						disabled={create.isPending || !name || !serial || !appiumUrl}
					>
						{create.isPending ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Plus className="mr-2 h-4 w-4" />
						)}
						添加设备
					</Button>
				</div>

				<div className="mt-4 space-y-3">
					{devices.data?.map((device) => (
						<div
							key={device.id}
							className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800"
						>
							<div>
								<p className="font-medium">
									{device.name}{" "}
									<span className="ml-2 text-xs text-gray-500">
										{device.status}
									</span>
								</p>
								<p className="text-xs text-gray-500">
									{device.kind} · {device.serial} ·{" "}
									{device.supportedProviders
										.map((provider) => LABELS[provider])
										.join("、")}
								</p>
								{device.lastError && (
									<p className="mt-1 text-xs text-red-600">
										{device.lastError}
									</p>
								)}
							</div>
							<div className="flex flex-wrap gap-2">
								<Button
									size="sm"
									variant="outline"
									disabled={test.isPending}
									onClick={async () => {
										try {
											const result = await test.mutateAsync({
												workspaceId,
												id: device.id,
											});
											await utils.device.list.invalidate({ workspaceId });
											toast.success(
												result?.status === "ready"
													? "设备与登录态正常"
													: `检测结果：${result?.status}`,
											);
										} catch (error) {
											toast.error(errorMessage(error));
										}
									}}
								>
									连接与登录检测
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={async () => {
										await update.mutateAsync({
											workspaceId,
											id: device.id,
											enabled: !device.enabled,
										});
										await utils.device.list.invalidate({ workspaceId });
									}}
								>
									{device.enabled ? "停用" : "启用"}
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={async () => {
										try {
											await remove.mutateAsync({ workspaceId, id: device.id });
											await utils.device.list.invalidate({ workspaceId });
											toast.success("设备已删除，历史数据保留");
										} catch (error) {
											toast.error(errorMessage(error));
										}
									}}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						</div>
					))}
					{devices.data?.length === 0 && (
						<p className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
							暂无设备连接
						</p>
					)}
				</div>
			</section>
		</div>
	);
}
