"use client";

import { api } from "@/trpc/react";
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
	Textarea,
	toast,
} from "@oneglanse/ui";
import { Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

/** Multi-value fields are edited as one entry per line. */
function toLines(values: string[] | undefined): string {
	return (values ?? []).join("\n");
}

function fromLines(value: string): string[] {
	return value
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

type Draft = {
	fullName: string;
	business: string;
	positioning: string;
	audience: string;
	contact: string;
	sellingPoints: string;
	cities: string;
	credentials: string;
};

const EMPTY_DRAFT: Draft = {
	fullName: "",
	business: "",
	positioning: "",
	audience: "",
	contact: "",
	sellingPoints: "",
	cities: "",
	credentials: "",
};

/**
 * Brand facts are the only source of truth PR drafts are allowed to write from,
 * so this form is the gate that keeps generated copy verifiable.
 */
export function BrandProfileDialog({
	workspaceId,
	brandName,
	open,
	onOpenChange,
}: {
	workspaceId: string;
	brandName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const utils = api.useUtils();
	const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
	const [seeded, setSeeded] = useState(false);
	const profileQuery = api.admin.getBrandProfile.useQuery(
		{ workspaceId },
		{ enabled: open },
	);
	const updateProfileMutation = api.admin.updateBrandProfile.useMutation();

	// Seed once per opening. Re-seeding on every data change would overwrite
	// whatever the admin had typed while the query was still in flight.
	useEffect(() => {
		if (!open) {
			setSeeded(false);
			return;
		}
		if (seeded || !profileQuery.isFetched) return;

		const profile = profileQuery.data;
		setDraft(
			profile
				? {
						fullName: profile.fullName ?? "",
						business: profile.business ?? "",
						positioning: profile.positioning ?? "",
						audience: profile.audience ?? "",
						contact: profile.contact ?? "",
						sellingPoints: toLines(profile.sellingPoints),
						cities: toLines(profile.cities),
						credentials: toLines(profile.credentials),
					}
				: EMPTY_DRAFT,
		);
		setSeeded(true);
	}, [open, seeded, profileQuery.isFetched, profileQuery.data]);

	const setField = (field: keyof Draft, value: string) => {
		setDraft((current) => ({ ...current, [field]: value }));
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			await updateProfileMutation.mutateAsync({
				workspaceId,
				fullName: draft.fullName.trim(),
				business: draft.business.trim(),
				positioning: draft.positioning.trim(),
				audience: draft.audience.trim(),
				contact: draft.contact.trim(),
				sellingPoints: fromLines(draft.sellingPoints),
				cities: fromLines(draft.cities),
				credentials: fromLines(draft.credentials),
			});
			await utils.admin.getBrandProfile.invalidate({ workspaceId });
			toast.success("品牌档案已保存");
			onOpenChange(false);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "保存失败");
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>{brandName} · 品牌档案</DialogTitle>
					<DialogDescription>
						这些是生成 PR 稿时唯一允许引用的事实。没填的字段，稿子里就不会出现。
					</DialogDescription>
				</DialogHeader>

				{profileQuery.isLoading ? (
					<div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
						<Loader2 className="size-4 animate-spin" />
						正在加载
					</div>
				) : (
					<form onSubmit={handleSubmit} className="grid gap-4">
						<div className="grid gap-1.5">
							<Label htmlFor="profile-full-name">公司全称</Label>
							<Input
								id="profile-full-name"
								value={draft.fullName}
								onChange={(event) => setField("fullName", event.target.value)}
								placeholder="与营业执照一致，例如 上海某某美容服务有限公司"
								maxLength={120}
							/>
						</div>

						<div className="grid gap-1.5">
							<Label htmlFor="profile-business">主营业务</Label>
							<Textarea
								id="profile-business"
								value={draft.business}
								onChange={(event) => setField("business", event.target.value)}
								placeholder="做什么生意、提供什么服务"
								maxLength={500}
								rows={3}
							/>
						</div>

						<div className="grid gap-1.5">
							<Label htmlFor="profile-positioning">品牌定位</Label>
							<Textarea
								id="profile-positioning"
								value={draft.positioning}
								onChange={(event) =>
									setField("positioning", event.target.value)
								}
								placeholder="一句话说明和同行比，差异在哪"
								maxLength={500}
								rows={2}
							/>
						</div>

						<div className="grid gap-1.5">
							<Label htmlFor="profile-selling-points">
								核心卖点（一行一条）
							</Label>
							<Textarea
								id="profile-selling-points"
								value={draft.sellingPoints}
								onChange={(event) =>
									setField("sellingPoints", event.target.value)
								}
								placeholder={
									"例如：只做纹发，不做其他美容项目\n例如：不满意可免费补色一次"
								}
								rows={4}
							/>
						</div>

						<div className="grid gap-1.5">
							<Label htmlFor="profile-cities">
								覆盖城市 / 门店（一行一条）
							</Label>
							<Textarea
								id="profile-cities"
								value={draft.cities}
								onChange={(event) => setField("cities", event.target.value)}
								placeholder={"例如：上海 静安寺店\n例如：杭州 武林门店"}
								rows={3}
							/>
						</div>

						<div className="grid gap-1.5">
							<Label htmlFor="profile-credentials">资质荣誉（一行一条）</Label>
							<Textarea
								id="profile-credentials"
								value={draft.credentials}
								onChange={(event) =>
									setField("credentials", event.target.value)
								}
								placeholder="真实的资质、认证、奖项，没有就留空"
								rows={3}
							/>
						</div>

						<div className="grid gap-1.5">
							<Label htmlFor="profile-audience">目标客户</Label>
							<Textarea
								id="profile-audience"
								value={draft.audience}
								onChange={(event) => setField("audience", event.target.value)}
								placeholder="主要服务哪类人群"
								maxLength={500}
								rows={2}
							/>
						</div>

						<div className="grid gap-1.5">
							<Label htmlFor="profile-contact">联系方式</Label>
							<Textarea
								id="profile-contact"
								value={draft.contact}
								onChange={(event) => setField("contact", event.target.value)}
								placeholder="电话、微信、地址等公开联系方式"
								maxLength={500}
								rows={2}
							/>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="ghost"
								onClick={() => onOpenChange(false)}
								disabled={updateProfileMutation.isPending}
							>
								取消
							</Button>
							<Button type="submit" disabled={updateProfileMutation.isPending}>
								{updateProfileMutation.isPending ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									"保存"
								)}
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
