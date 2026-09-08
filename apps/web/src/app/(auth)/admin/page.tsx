"use client";

import { api } from "@/trpc/react";
import { Loader2, ShieldCheck, Store, Users } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
	const accountsQuery = api.admin.listAccounts.useQuery();
	const accounts = accountsQuery.data ?? [];
	const brandCount = accounts.reduce(
		(total, account) => total + account.brands.length,
		0,
	);

	return (
		<div className="mx-auto w-full max-w-6xl space-y-6 px-5 py-6 lg:px-8 lg:py-8">
			<div>
				<p className="text-muted-foreground text-sm">GEO见客</p>
				<h2 className="mt-1 font-semibold text-2xl tracking-tight">
					管理员控制台
				</h2>
				<p className="mt-2 text-muted-foreground text-sm">
					查看所有已注册账号及其品牌。
				</p>
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
											<div className="flex flex-wrap gap-2">
												{account.brands.length ? (
													account.brands.map((brand) => (
														<Link
															key={brand.id}
															href={`/dashboard?workspace=${brand.id}`}
															className="rounded-full bg-stone-100 px-2.5 py-1 hover:bg-stone-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
														>
															{brand.name}
														</Link>
													))
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
