"use client";

import { api } from "@/trpc/react";
import { Button, Input, toast } from "@oneglanse/ui";
import {
	Copy,
	Eye,
	EyeOff,
	KeyRound,
	Loader2,
	Pencil,
	ShieldCheck,
	Store,
	UserPlus,
	Users,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

export default function AdminPage() {
	const utils = api.useUtils();
	const accountsQuery = api.admin.listAccounts.useQuery();
	const [account, setAccount] = useState("");
	const [password, setPassword] = useState("");
	const [brandName, setBrandName] = useState("");
	const [visiblePasswordIds, setVisiblePasswordIds] = useState<Set<string>>(
		new Set(),
	);
	const [editingPasswordUserId, setEditingPasswordUserId] = useState<
		string | null
	>(null);
	const [replacementPassword, setReplacementPassword] = useState("");
	const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
	const [brandNameDraft, setBrandNameDraft] = useState("");
	const [brandDomainDraft, setBrandDomainDraft] = useState("");
	const createAccountMutation = api.admin.createAccount.useMutation();
	const setAccountPasswordMutation = api.admin.setAccountPassword.useMutation();
	const updateBrandMutation = api.admin.updateBrand.useMutation();
	const accounts = accountsQuery.data ?? [];
	const brandCount = accounts.reduce(
		(total, account) => total + account.brands.length,
		0,
	);
	const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			await createAccountMutation.mutateAsync({
				account: account.trim(),
				password,
				brandName: brandName.trim(),
			});
			setAccount("");
			setPassword("");
			setBrandName("");
			await accountsQuery.refetch();
			toast.success("只读用户创建成功");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "创建账号失败");
		}
	};
	const togglePasswordVisibility = (userId: string) => {
		setVisiblePasswordIds((current) => {
			const next = new Set(current);
			if (next.has(userId)) next.delete(userId);
			else next.add(userId);
			return next;
		});
	};
	const handleCopyPassword = async (password: string) => {
		try {
			await navigator.clipboard.writeText(password);
			toast.success("密码已复制");
		} catch {
			toast.error("复制失败，请手动复制");
		}
	};
	const handleUpdateBrand = async (
		event: FormEvent<HTMLFormElement>,
		workspaceId: string,
	) => {
		event.preventDefault();
		try {
			await updateBrandMutation.mutateAsync({
				workspaceId,
				name: brandNameDraft.trim(),
				domain: brandDomainDraft.trim(),
			});
			setEditingBrandId(null);
			toast.success("品牌已更新");
			await utils.admin.listAccounts.invalidate();
			await utils.workspace.getById.invalidate({ workspaceId });
			await utils.workspace.listAllForUser.invalidate();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "品牌更新失败");
		}
	};
	const handleSetPassword = async (
		event: FormEvent<HTMLFormElement>,
		userId: string,
	) => {
		event.preventDefault();
		try {
			await setAccountPasswordMutation.mutateAsync({
				userId,
				password: replacementPassword,
			});
			setEditingPasswordUserId(null);
			setReplacementPassword("");
			setVisiblePasswordIds((current) => new Set(current).add(userId));
			await accountsQuery.refetch();
			toast.success("密码已更新");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "密码更新失败");
		}
	};

	return (
		<div className="mx-auto w-full max-w-6xl space-y-6 px-5 py-6 lg:px-8 lg:py-8">
			<div>
				<p className="text-muted-foreground text-sm">觅蜂引客</p>
				<h2 className="mt-1 font-semibold text-2xl tracking-tight">
					管理员控制台
				</h2>
				<p className="mt-2 text-muted-foreground text-sm">
					查看所有已注册账号及其品牌，可修改品牌名与品牌域名。
				</p>
			</div>

			<div className="rounded-[var(--app-radius)] bg-white p-5 shadow-sm dark:bg-neutral-950">
				<div className="flex items-center gap-2">
					<UserPlus className="size-4" />
					<h3 className="font-medium">创建只读用户</h3>
				</div>
				<p className="mt-1 text-muted-foreground text-sm">
					创建后将账号和初始密码交给用户，用户只能查看看板、提示词、信源和报告。
				</p>
				<form
					onSubmit={handleCreateAccount}
					className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]"
				>
					<label className="grid gap-1.5 text-sm" htmlFor="new-account">
						账号
						<Input
							id="new-account"
							value={account}
							onChange={(event) => setAccount(event.target.value)}
							placeholder="例如 customer01"
							autoComplete="off"
							required
							minLength={3}
							maxLength={32}
							pattern="[a-zA-Z0-9_.-]+"
						/>
					</label>
					<label className="grid gap-1.5 text-sm" htmlFor="new-password">
						初始密码
						<Input
							id="new-password"
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							placeholder="至少 8 个字符"
							autoComplete="new-password"
							required
							minLength={8}
							maxLength={128}
						/>
					</label>
					<label className="grid gap-1.5 text-sm" htmlFor="new-brand-name">
						品牌名
						<Input
							id="new-brand-name"
							value={brandName}
							onChange={(event) => setBrandName(event.target.value)}
							placeholder="用户查看的品牌"
							autoComplete="off"
							required
							minLength={2}
							maxLength={80}
						/>
					</label>
					<Button
						type="submit"
						className="self-end"
						disabled={createAccountMutation.isPending}
					>
						{createAccountMutation.isPending ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							"创建账号"
						)}
					</Button>
				</form>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div className="rounded-[var(--app-radius)] bg-white p-5 shadow-sm dark:bg-neutral-950">
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<Users className="size-4" />
						注册账号
					</div>
					<p className="mt-3 font-semibold text-3xl">{accounts.length}</p>
				</div>
				<div className="rounded-[var(--app-radius)] bg-white p-5 shadow-sm dark:bg-neutral-950">
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<Store className="size-4" />
						品牌数量
					</div>
					<p className="mt-3 font-semibold text-3xl">{brandCount}</p>
				</div>
			</div>

			<div className="overflow-hidden rounded-[var(--app-radius)] bg-white shadow-sm dark:bg-neutral-950">
				<div className="border-b px-5 py-4 dark:border-neutral-800">
					<h3 className="font-medium">账号与品牌</h3>
				</div>
				{accountsQuery.isLoading ? (
					<div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
						<Loader2 className="size-4 animate-spin" />
						正在加载
					</div>
				) : accountsQuery.error ? (
					<div className="py-16 text-center text-red-600 text-sm">
						账号列表加载失败
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead className="bg-stone-50 text-muted-foreground text-xs dark:bg-neutral-900">
								<tr>
									<th className="px-5 py-3 font-medium">账号</th>
									<th className="px-5 py-3 font-medium">密码</th>
									<th className="px-5 py-3 font-medium">品牌名</th>
									<th className="px-5 py-3 font-medium">身份</th>
									<th className="px-5 py-3 font-medium">注册时间</th>
								</tr>
							</thead>
							<tbody>
								{accounts.map((account) => (
									<tr
										key={account.id}
										className="border-t dark:border-neutral-800"
									>
										<td className="px-5 py-4 font-medium">{account.account}</td>
										<td className="px-5 py-4">
											{account.role === "admin" ? (
												<span className="text-muted-foreground">—</span>
											) : editingPasswordUserId === account.id ? (
												<form
													onSubmit={(event) =>
														handleSetPassword(event, account.id)
													}
													className="flex min-w-64 items-center gap-2"
												>
													<Input
														type="text"
														value={replacementPassword}
														onChange={(event) =>
															setReplacementPassword(event.target.value)
														}
														placeholder="输入新密码"
														autoComplete="new-password"
														minLength={8}
														maxLength={128}
														required
														autoFocus
													/>
													<Button
														type="submit"
														size="sm"
														disabled={setAccountPasswordMutation.isPending}
													>
														保存
													</Button>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => {
															setEditingPasswordUserId(null);
															setReplacementPassword("");
														}}
													>
														取消
													</Button>
												</form>
											) : account.password ? (
												<div className="flex min-w-64 items-center gap-1">
													<code className="min-w-24 rounded bg-stone-100 px-2 py-1 dark:bg-neutral-800">
														{visiblePasswordIds.has(account.id)
															? account.password
															: "••••••••"}
													</code>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => togglePasswordVisibility(account.id)}
														title={
															visiblePasswordIds.has(account.id)
																? "隐藏密码"
																: "显示密码"
														}
													>
														{visiblePasswordIds.has(account.id) ? (
															<EyeOff className="size-4" />
														) : (
															<Eye className="size-4" />
														)}
													</Button>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() =>
															handleCopyPassword(account.password ?? "")
														}
														title="复制密码"
													>
														<Copy className="size-4" />
													</Button>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => {
															setEditingPasswordUserId(account.id);
															setReplacementPassword("");
														}}
													>
														<KeyRound className="mr-1 size-4" />
														重设
													</Button>
												</div>
											) : (
												<Button
													type="button"
													variant="secondary"
													size="sm"
													onClick={() => {
														setEditingPasswordUserId(account.id);
														setReplacementPassword("");
													}}
												>
													<KeyRound className="mr-1 size-4" />
													设置密码
												</Button>
											)}
										</td>
										<td className="px-5 py-4">
											<div className="flex flex-wrap gap-2">
												{account.brands.length ? (
													account.brands.map((brand) =>
														editingBrandId === brand.id ? (
															<form
																key={brand.id}
																onSubmit={(event) =>
																	handleUpdateBrand(event, brand.id)
																}
																className="flex min-w-64 flex-col gap-2"
															>
																<Input
																	value={brandNameDraft}
																	onChange={(event) =>
																		setBrandNameDraft(event.target.value)
																	}
																	placeholder="品牌名"
																	autoComplete="off"
																	required
																	minLength={2}
																	maxLength={80}
																	autoFocus
																/>
																<Input
																	value={brandDomainDraft}
																	onChange={(event) =>
																		setBrandDomainDraft(event.target.value)
																	}
																	placeholder="品牌域名，例如 example.com"
																	autoComplete="off"
																	maxLength={256}
																/>
																<div className="flex items-center gap-2">
																	<Button
																		type="submit"
																		size="sm"
																		disabled={updateBrandMutation.isPending}
																	>
																		保存
																	</Button>
																	<Button
																		type="button"
																		variant="ghost"
																		size="sm"
																		onClick={() => setEditingBrandId(null)}
																		disabled={updateBrandMutation.isPending}
																	>
																		取消
																	</Button>
																</div>
															</form>
														) : (
															<span
																key={brand.id}
																className="inline-flex items-center gap-1"
															>
																<Link
																	href={`/dashboard?workspace=${brand.id}`}
																	className="rounded-full bg-stone-100 px-2.5 py-1 hover:bg-stone-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
																>
																	{brand.name}
																</Link>
																<Button
																	type="button"
																	variant="ghost"
																	size="sm"
																	className="h-8 w-8 p-0"
																	title="修改品牌名与域名"
																	onClick={() => {
																		setEditingBrandId(brand.id);
																		setBrandNameDraft(brand.name);
																		setBrandDomainDraft(brand.domain);
																	}}
																>
																	<Pencil className="size-4" />
																</Button>
															</span>
														),
													)
												) : (
													<span className="text-muted-foreground">
														暂无品牌
													</span>
												)}
											</div>
										</td>
										<td className="px-5 py-4">
											<span className="inline-flex items-center gap-1">
												<ShieldCheck className="size-3.5" />
												{account.role === "admin" ? "管理员" : "注册用户"}
											</span>
										</td>
										<td className="px-5 py-4 text-muted-foreground">
											{new Intl.DateTimeFormat("zh-CN", {
												dateStyle: "medium",
											}).format(account.createdAt)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
