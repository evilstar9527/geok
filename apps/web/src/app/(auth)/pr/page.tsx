"use client";

import { downloadJson, downloadMarkdown } from "@/lib/export/download";
import { useSafeSearchParams } from "@/lib/navigation/use-safe-search-params";
import { api } from "@/trpc/react";
import {
	Button,
	EmptyStatePanel,
	SectionHeading,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Skeleton,
	WorkspaceRequiredState,
	toast,
} from "@oneglanse/ui";
import { cn } from "@oneglanse/utils";
import {
	Copy,
	Download,
	FileText,
	Loader2,
	Sparkles,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { useUserPrompts } from "../prompts/_lib/queries/prompt.queries";
import { useIsAdministrator } from "../workspace-context";

/** Titles are model output, so strip anything a filesystem would reject. */
function fileBase(title: string): string {
	return (
		title
			.replace(/[\\/:*?"<>|]/g, "")
			.trim()
			.slice(0, 60) || "pr-article"
	);
}

function formatDate(value: Date | string): string {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	return date.toLocaleString("zh-CN", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function PrArticlesPage() {
	const searchParams = useSafeSearchParams();
	const workspaceId = searchParams.get("workspace") ?? "";
	const isAdministrator = useIsAdministrator();
	const utils = api.useUtils();

	// The sources page links here with the prompt it was showing.
	const [selectedPromptId, setSelectedPromptId] = useState(
		() => searchParams.get("promptId") ?? "",
	);
	const [pickedArticleId, setPickedArticleId] = useState<string | null>(null);

	const promptsQuery = useUserPrompts(workspaceId);
	const articlesQuery = api.pr.list.useQuery(
		{ workspaceId },
		{ enabled: !!workspaceId },
	);
	const generateMutation = api.pr.generate.useMutation();
	const removeMutation = api.pr.remove.useMutation();

	const prompts = promptsQuery.data ?? [];
	const articles = articlesQuery.data ?? [];
	// Falling back to the newest draft keeps the detail pane filled without an
	// effect that would fight the selection after a refetch.
	const activeId = pickedArticleId ?? articles[0]?.id ?? null;

	const detailQuery = api.pr.get.useQuery(
		{ workspaceId, id: activeId ?? "" },
		{ enabled: !!workspaceId && !!activeId },
	);
	const article = detailQuery.data;

	if (!workspaceId) {
		return (
			<WorkspaceRequiredState
				icon={FileText}
				title="Pick a Workspace"
				description="Open a workspace to draft press articles from its sources."
			/>
		);
	}

	const handleGenerate = async () => {
		if (!selectedPromptId) {
			toast.error("请先选择一个提示词");
			return;
		}
		try {
			const { id } = await generateMutation.mutateAsync({
				workspaceId,
				promptId: selectedPromptId,
			});
			await utils.pr.list.invalidate({ workspaceId });
			setPickedArticleId(id);
			toast.success("PR 稿已生成");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "生成失败");
		}
	};

	const handleRemove = async (id: string) => {
		try {
			await removeMutation.mutateAsync({ workspaceId, id });
			if (pickedArticleId === id) setPickedArticleId(null);
			await utils.pr.list.invalidate({ workspaceId });
			toast.success("已删除");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "删除失败");
		}
	};

	const handleCopy = async (markdown: string) => {
		try {
			await navigator.clipboard.writeText(markdown);
			toast.success("Markdown 已复制");
		} catch {
			toast.error("复制失败，请手动选中复制");
		}
	};

	return (
		<div className="web-page-wide">
			<div className="web-page-wide-inner">
				<div className="ui-stagger space-y-5 sm:space-y-6">
					<SectionHeading
						eyebrow="PR 稿"
						title="按信源生成品牌 PR 稿"
						description="基于某个提示词已被 AI 采纳的信源，参考权重最高的那些来源和同行的写法，生成一篇便于 AI 阅读与抓取的品牌稿。"
					/>

					{isAdministrator && (
						<div className="rounded-[var(--app-radius)] bg-white p-5 shadow-sm dark:bg-neutral-950">
							<div className="flex items-center gap-2">
								<Sparkles className="size-4" />
								<h3 className="font-medium">生成新稿</h3>
							</div>
							<p className="mt-1 text-muted-foreground text-sm">
								选择提示词后生成。信源按被引用次数排序，权重高的会被重点参考。
							</p>
							<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
								<Select
									value={selectedPromptId}
									onValueChange={setSelectedPromptId}
								>
									<SelectTrigger className="w-full sm:max-w-md">
										<SelectValue placeholder="选择提示词" />
									</SelectTrigger>
									<SelectContent>
										{prompts.map((prompt) => (
											<SelectItem key={prompt.id} value={prompt.id}>
												{prompt.prompt}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
									onClick={handleGenerate}
									disabled={generateMutation.isPending || !selectedPromptId}
								>
									{generateMutation.isPending ? (
										<>
											<Loader2 className="mr-1 size-4 animate-spin" />
											生成中，约需 1-2 分钟
										</>
									) : (
										"生成 PR 稿"
									)}
								</Button>
							</div>
						</div>
					)}

					<div className="grid gap-4 lg:grid-cols-[320px_1fr]">
						<div className="rounded-[var(--app-radius)] bg-white p-4 shadow-sm dark:bg-neutral-950">
							<h3 className="px-1 font-medium text-sm">已生成的稿子</h3>
							<div className="mt-3 space-y-1">
								{articlesQuery.isLoading ? (
									<Skeleton className="h-14 w-full" />
								) : articles.length === 0 ? (
									<p className="px-1 py-6 text-center text-muted-foreground text-sm">
										还没有生成过 PR 稿
									</p>
								) : (
									articles.map((item) => (
										<button
											key={item.id}
											type="button"
											onClick={() => setPickedArticleId(item.id)}
											className={cn(
												"w-full rounded-lg px-3 py-2 text-left transition-colors",
												activeId === item.id
													? "bg-stone-100 dark:bg-neutral-800"
													: "hover:bg-stone-50 dark:hover:bg-neutral-900",
											)}
										>
											<span className="line-clamp-2 font-medium text-sm">
												{item.title}
											</span>
											<span className="mt-0.5 block text-muted-foreground text-xs">
												{formatDate(item.createdAt)}
											</span>
										</button>
									))
								)}
							</div>
						</div>

						<div className="rounded-[var(--app-radius)] bg-white p-5 shadow-sm dark:bg-neutral-950">
							{!activeId ? (
								<EmptyStatePanel
									icon={FileText}
									title="从左侧选择一篇稿子"
									description="或者在上面选一个提示词，用它的信源生成一篇新的品牌 PR 稿。"
								/>
							) : detailQuery.isLoading || !article ? (
								<div className="space-y-3">
									<Skeleton className="h-8 w-2/3" />
									<Skeleton className="h-40 w-full" />
								</div>
							) : (
								<div className="space-y-4">
									<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
										<div>
											<h2 className="font-semibold text-xl">{article.title}</h2>
											<p className="mt-1 text-muted-foreground text-sm">
												{formatDate(article.generatedAt)} · 模型 {article.model}{" "}
												· 参考 {article.sources.length} 条信源
											</p>
											<p className="mt-1 text-muted-foreground text-sm">
												提示词：{article.promptText}
											</p>
										</div>
										<div className="flex shrink-0 flex-wrap gap-2">
											<Button
												variant="secondary"
												size="sm"
												onClick={() => handleCopy(article.markdown)}
											>
												<Copy className="mr-1 size-4" />
												复制
											</Button>
											<Button
												variant="secondary"
												size="sm"
												onClick={() =>
													downloadMarkdown(
														`${fileBase(article.title)}.md`,
														article.markdown,
													)
												}
											>
												<Download className="mr-1 size-4" />
												Markdown
											</Button>
											<Button
												variant="secondary"
												size="sm"
												onClick={() =>
													downloadJson(
														`${fileBase(article.title)}.jsonld.json`,
														article.jsonLd,
													)
												}
											>
												<Download className="mr-1 size-4" />
												JSON-LD
											</Button>
											{isAdministrator && (
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleRemove(activeId)}
													disabled={removeMutation.isPending}
												>
													<Trash2 className="size-4" />
												</Button>
											)}
										</div>
									</div>

									<pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-lg bg-stone-50 p-4 text-sm leading-relaxed dark:bg-neutral-900">
										{article.markdown}
									</pre>

									<div>
										<h3 className="font-medium text-sm">参考的信源</h3>
										<ul className="mt-2 space-y-2">
											{article.sources.map((source) => (
												<li
													key={source.url}
													className="rounded-lg border p-3 text-sm dark:border-neutral-800"
												>
													<a
														href={source.url}
														target="_blank"
														rel="noreferrer"
														className="font-medium hover:underline"
													>
														{source.title}
													</a>
													<div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
														<span>{source.domain}</span>
														<span>·</span>
														<span>{source.mediaType}</span>
														<span>·</span>
														<span>被引用 {source.citationCount} 次</span>
														<span>·</span>
														<span>
															域名占比 {source.domainSharePercent.toFixed(2)}%
														</span>
														{source.isCompetitor && (
															<span className="rounded-full bg-stone-100 px-2 py-0.5 dark:bg-neutral-800">
																同行
															</span>
														)}
													</div>
												</li>
											))}
										</ul>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
