"use client";

import {
	formFieldClassName,
	formHintClassName,
	formLabelClassName,
	formPanelClassName,
	formPrimaryButtonClassName,
	formSecondaryButtonClassName,
} from "@/components/forms/auth-form-chrome";
import { useSafeSearchParams } from "@/lib/navigation/use-safe-search-params";
import { api } from "@/trpc/react";
import {
	Button,
	EmptyStatePanel,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	toast,
} from "@oneglanse/ui";
import { cn } from "@oneglanse/utils";
import {
	Building2,
	Loader2,
	Pencil,
	Plus,
	Trash2,
	Users,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLayoutWorkspace } from "../workspace-context";

interface WorkspaceMember {
	memberId: string;
	userId: string;
	role: string;
	joinedAt: Date;
	userName: string;
	userEmail: string;
	userImage: string | null;
}

const WORKSPACE_MEMBER_SKELETON_KEYS = [
	"workspace-member-a",
	"workspace-member-b",
	"workspace-member-c",
	"workspace-member-d",
] as const;

export default function PeoplePage() {
	const searchParams = useSafeSearchParams();
	const workspaceId = searchParams.get("workspace") ?? "";
	const utils = api.useUtils();
	const layoutWorkspace = useLayoutWorkspace();

	// Invite state
	const [wsInviteEmail, setWsInviteEmail] = useState("");
	const [wsInviteRole, setWsInviteRole] = useState("member");
	const [wsAdding, setWsAdding] = useState(false);

	// Edit state
	const [workspaceName, setWorkspaceName] = useState("");
	const [workspaceDomain, setWorkspaceDomain] = useState("");
	const [organizationName, setOrganizationName] = useState("");
	const [savingWorkspace, setSavingWorkspace] = useState(false);
	const [savingOrg, setSavingOrg] = useState(false);
	const [isEditingWorkspace, setIsEditingWorkspace] = useState(false);
	const [isEditingOrg, setIsEditingOrg] = useState(false);

	// Queries
	const wsMembersQuery = api.workspace.listMembers.useQuery(
		{ workspaceId },
		{ enabled: !!workspaceId },
	);
	const workspaceQuery = api.workspace.getById.useQuery(
		{ workspaceId },
		{
			enabled: !!workspaceId,
			initialData:
				layoutWorkspace?.id === workspaceId ? layoutWorkspace : undefined,
		},
	);
	const joinInfoQuery = api.workspace.getJoinInfo.useQuery(
		{ workspaceId },
		{ enabled: !!workspaceId },
	);

	const wsMembers = (wsMembersQuery.data ?? []) as WorkspaceMember[];
	const joinInfo = joinInfoQuery.data;
	const joinInfoLoading = joinInfoQuery.isLoading;
	const workspace = workspaceQuery.data;
	const organization = joinInfo?.organization;

	// Mutations
	const addWsMemberMutation = api.workspace.addMember.useMutation();
	const removeWsMemberMutation = api.workspace.removeMember.useMutation();
	const updateWorkspaceMutation = api.workspace.updateDetails.useMutation();
	const updateOrgMutation = api.workspace.updateOrganizationName.useMutation();

	useEffect(() => {
		setWorkspaceName(workspace?.name ?? "");
		setWorkspaceDomain(workspace?.domain ?? "");
	}, [workspace?.name, workspace?.domain]);

	useEffect(() => {
		setOrganizationName(organization?.name ?? "");
	}, [organization?.name]);

	const normalizedWorkspaceName = workspaceName.trim();
	const normalizedWorkspaceDomain = workspaceDomain.trim();
	const normalizedOrganizationName = organizationName.trim();
	const workspaceDetailsChanged =
		normalizedWorkspaceName !== (workspace?.name ?? "").trim() ||
		normalizedWorkspaceDomain !== (workspace?.domain ?? "").trim();
	const organizationNameChanged =
		normalizedOrganizationName !== (organization?.name ?? "").trim();

	const handleCopy = async (value: string, label: string) => {
		if (!value) return;
		try {
			await navigator.clipboard.writeText(value);
			toast.success(`${label} copied to clipboard.`);
		} catch {
			toast.error("复制失败。");
		}
	};

	const handleWsAddMember = async () => {
		if (!wsInviteEmail.trim()) {
			toast.error("请输入邮箱地址。");
			return;
		}
		setWsAdding(true);
		try {
			const result = await addWsMemberMutation.mutateAsync({
				workspaceId,
				email: wsInviteEmail.trim(),
				role: wsInviteRole as "owner" | "member",
			});
			if (result?.status === "not-found") {
				toast.error("未找到该用户。请分享工作区邀请码，方便对方注册后加入。");
				setWsInviteEmail("");
				return;
			}
			if (result?.status === "already-member") {
				toast.success("该用户已是工作区成员。");
				setWsInviteEmail("");
				return;
			}
			toast.success("已添加工作区成员。");
			setWsInviteEmail("");
			await wsMembersQuery.refetch();
		} catch (err) {
			console.error(err);
			toast.error("添加工作区成员失败。");
		} finally {
			setWsAdding(false);
		}
	};

	const handleWsRemoveMember = async (userId: string, role: string) => {
		try {
			await removeWsMemberMutation.mutateAsync({ workspaceId, userId, role });
			toast.success("已移除工作区成员。");
			await wsMembersQuery.refetch();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "移除成员失败。");
		}
	};

	const handleSaveWorkspaceDetails = async () => {
		if (!workspaceName.trim() || !workspaceDomain.trim()) {
			toast.error("请输入品牌名称和品牌域名。");
			return;
		}
		if (!workspaceDetailsChanged) return;

		const nextName = workspaceName.trim();
		const nextDomain = workspaceDomain.trim();
		const brandChanged =
			(workspace?.name ?? "").trim() !== nextName ||
			(workspace?.domain ?? "").trim() !== nextDomain;

		if (brandChanged) {
			const confirmed = window.confirm(
				"修改品牌信息将清空工作区分析数据，需要重新分析。原始回答会保留。是否继续？",
			);
			if (!confirmed) return;
		}

		setSavingWorkspace(true);
		try {
			const result = await updateWorkspaceMutation.mutateAsync({
				workspaceId,
				name: nextName,
				domain: nextDomain,
			});
			if (result?.analysisReset) {
				toast.success(
					"品牌信息已更新。原分析数据已清空，将在下次分析时重新生成。",
				);
			} else {
				toast.success("工作区信息已更新。");
			}
			await workspaceQuery.refetch();
			await joinInfoQuery.refetch();
			await utils.workspace.listAllForUser.invalidate();
			await utils.workspace.getById.invalidate({ workspaceId });
			await utils.workspace.getJoinInfo.invalidate({ workspaceId });
			setIsEditingWorkspace(false);
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: "Failed to update workspace details.",
			);
		} finally {
			setSavingWorkspace(false);
		}
	};

	const handleSaveOrganizationName = async () => {
		if (!organizationName.trim()) {
			toast.error("请输入组织名称。");
			return;
		}
		if (!organizationNameChanged) return;
		setSavingOrg(true);
		try {
			await updateOrgMutation.mutateAsync({
				workspaceId,
				organizationName: organizationName.trim(),
			});
			toast.success("组织名称已更新。");
			await joinInfoQuery.refetch();
			await utils.workspace.listAllForUser.invalidate();
			await utils.workspace.getJoinInfo.invalidate({ workspaceId });
			setIsEditingOrg(false);
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: "Only workspace owners can update organization name.",
			);
		} finally {
			setSavingOrg(false);
		}
	};

	const getRoleBadgeClass = (role: string) => {
		switch (role) {
			/* Owner takes the brand yellow and admin the ink band, so the two
			   privileged roles read as the brand rather than as two more colors. */
			case "owner":
				return "bg-[var(--geo-accent)] text-[var(--geo-on-accent)]";
			case "admin":
				return "bg-[var(--geo-on-accent)] text-[var(--geo-accent)]";
			default:
				return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
		}
	};

	if (!workspaceId) {
		return (
			<div className="web-centered-state">
				<div className="web-empty-state">
					<p className="text-sm text-gray-500 dark:text-gray-400">
						尚未选择工作区。
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="web-page-panel max-w-4xl">
			{/* Workspace & Organization */}
			<section>
				<div className="mb-4 flex items-center gap-2">
					<h2 className="text-base font-semibold text-gray-900 sm:text-lg dark:text-gray-100">
						工作区与组织
					</h2>
				</div>
				<div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
					{/* Brand Workspace */}
					<div className={cn(formPanelClassName, "flex h-full flex-col p-5")}>
						<div className="mb-3 flex items-center justify-between gap-2">
							<div className="flex items-center gap-2">
								<Users className="h-4 w-4 text-gray-500" />
								<p className="text-sm font-medium text-gray-900 dark:text-gray-100">
									品牌工作区
								</p>
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="h-8 w-8 p-0"
								onClick={() => {
									if (isEditingWorkspace) {
										setWorkspaceName(workspace?.name ?? "");
										setWorkspaceDomain(workspace?.domain ?? "");
										setIsEditingWorkspace(false);
										return;
									}
									setIsEditingWorkspace(true);
								}}
								aria-label={
									isEditingWorkspace ? "取消编辑工作区" : "Edit workspace"
								}
							>
								{isEditingWorkspace ? (
									<X className="h-4 w-4" />
								) : (
									<Pencil className="h-4 w-4" />
								)}
							</Button>
						</div>
						<div className="space-y-2">
							<Label
								htmlFor="people-workspace-name"
								className={formLabelClassName}
							>
								品牌名称
							</Label>
							<Input
								id="people-workspace-name"
								value={workspaceName}
								onChange={(e) => setWorkspaceName(e.target.value)}
								placeholder="例如：秘蜂赢客"
								disabled={!isEditingWorkspace}
								className={formFieldClassName}
							/>
						</div>
						<div className="mt-3 space-y-2">
							<Label
								htmlFor="people-workspace-domain"
								className={formLabelClassName}
							>
								品牌域名
							</Label>
							<Input
								id="people-workspace-domain"
								value={workspaceDomain}
								onChange={(e) => setWorkspaceDomain(e.target.value)}
								placeholder="例如：example.com"
								disabled={!isEditingWorkspace}
								className={formFieldClassName}
							/>
							<p className={formHintClassName}>
								用于追踪品牌在人工智能回答中的可见度和引用情况。
							</p>
							{isEditingWorkspace && (
								<div className="rounded-[var(--app-radius)] border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-900/60 dark:bg-amber-950/20">
									<p className="text-xs text-amber-800 dark:text-amber-300">
										注意：修改品牌信息将清空此工作区的分析数据，原始提问回答会保留。
									</p>
								</div>
							)}
						</div>
						<div className="mt-auto flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:justify-end">
							{isEditingWorkspace && (
								<>
									<Button
										variant="outline"
										className={cn(
											formSecondaryButtonClassName,
											"w-full sm:w-auto",
										)}
										onClick={() => {
											setWorkspaceName(workspace?.name ?? "");
											setWorkspaceDomain(workspace?.domain ?? "");
											setIsEditingWorkspace(false);
										}}
										disabled={savingWorkspace}
									>
										取消
									</Button>
									<Button
										onClick={handleSaveWorkspaceDetails}
										disabled={
											savingWorkspace ||
											!workspaceName.trim() ||
											!workspaceDomain.trim() ||
											!workspaceDetailsChanged
										}
										className={cn(
											formPrimaryButtonClassName,
											"w-full sm:w-auto",
										)}
									>
										{savingWorkspace ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											"保存"
										)}
									</Button>
								</>
							)}
						</div>
					</div>

					{/* Organization */}
					<div className={cn(formPanelClassName, "flex h-full flex-col p-5")}>
						<div className="mb-3 flex items-center justify-between gap-2">
							<div className="flex items-center gap-2">
								<Building2 className="h-4 w-4 text-gray-500" />
								<p className="text-sm font-medium text-gray-900 dark:text-gray-100">
									组织
								</p>
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="h-8 w-8 p-0"
								onClick={() => {
									if (isEditingOrg) {
										setOrganizationName(organization?.name ?? "");
										setIsEditingOrg(false);
										return;
									}
									setIsEditingOrg(true);
								}}
								aria-label={isEditingOrg ? "取消编辑组织" : "Edit organization"}
							>
								{isEditingOrg ? (
									<X className="h-4 w-4" />
								) : (
									<Pencil className="h-4 w-4" />
								)}
							</Button>
						</div>
						<div className="space-y-2">
							<Label htmlFor="people-org-name" className={formLabelClassName}>
								组织名称
							</Label>
							<Input
								id="people-org-name"
								value={organizationName}
								onChange={(e) => setOrganizationName(e.target.value)}
								placeholder="请输入组织名称"
								disabled={!isEditingOrg}
								className={formFieldClassName}
							/>
							<p className={formHintClassName}>
								仅工作区所有者可以修改组织名称。
							</p>
						</div>
						<div className="mt-auto flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:justify-end">
							{isEditingOrg && (
								<>
									<Button
										variant="outline"
										className={cn(
											formSecondaryButtonClassName,
											"w-full sm:w-auto",
										)}
										onClick={() => {
											setOrganizationName(organization?.name ?? "");
											setIsEditingOrg(false);
										}}
										disabled={savingOrg}
									>
										取消
									</Button>
									<Button
										onClick={handleSaveOrganizationName}
										disabled={
											savingOrg ||
											!organizationName.trim() ||
											!organizationNameChanged
										}
										className={cn(
											formPrimaryButtonClassName,
											"w-full sm:w-auto",
										)}
									>
										{savingOrg ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											"保存"
										)}
									</Button>
								</>
							)}
						</div>
					</div>
				</div>
			</section>

			{/* Join Code */}
			<section>
				<div className="mb-4 flex items-center gap-2">
					<h2 className="text-base font-semibold text-gray-900 sm:text-lg dark:text-gray-100">
						通过邀请码邀请
					</h2>
				</div>
				<div className={cn(formPanelClassName, "space-y-3 p-5")}>
					<div>
						<p className="text-sm font-medium text-gray-900 dark:text-gray-100">
							工作区邀请码
						</p>
						<p className={cn(formHintClassName, "mt-1")}>
							将邀请码分享给团队成员即可加入。每个工作区的邀请码全局唯一。
						</p>
						{joinInfo?.organization?.name && (
							<div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
								<span>
									组织：{" "}
									<span className="font-medium text-gray-700 dark:text-gray-300">
										{joinInfo.organization.name}
									</span>
								</span>
								{joinInfo?.workspace?.name && (
									<span>
										工作区：{" "}
										<span className="font-medium text-gray-700 dark:text-gray-300">
											{joinInfo.workspace.name}
										</span>
									</span>
								)}
							</div>
						)}
					</div>
					<div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
						{joinInfoLoading ? (
							<>
								<Skeleton className="h-9 w-full sm:w-[300px]" />
								<Skeleton className="h-9 w-full sm:w-16" />
							</>
						) : (
							<>
								<Input
									readOnly
									value={joinInfo?.workspaceCode ?? ""}
									placeholder="工作区邀请码"
									className={cn(
										formFieldClassName,
										"w-full max-w-md font-mono text-xs",
									)}
								/>
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										handleCopy(joinInfo?.workspaceCode ?? "", "工作区邀请码")
									}
									disabled={!joinInfo?.workspaceCode}
									className={cn(
										formSecondaryButtonClassName,
										"w-full sm:w-auto",
									)}
								>
									复制
								</Button>
							</>
						)}
					</div>
				</div>
			</section>

			{/* Members */}
			<section>
				<div className="mb-4 flex items-center gap-2">
					<h2 className="text-base font-semibold text-gray-900 sm:text-lg dark:text-gray-100">
						成员
					</h2>
				</div>

				{/* Add member form */}
				<div
					id="invite-member-form"
					className={cn(
						formPanelClassName,
						"mb-4 grid min-w-0 gap-3 p-5 lg:grid-cols-[minmax(0,1fr)_9rem_9rem] lg:items-end sm:p-6",
					)}
				>
					<Input
						placeholder="邮箱地址（必要时发送邀请）"
						value={wsInviteEmail}
						onChange={(e) => setWsInviteEmail(e.target.value)}
						className={cn(formFieldClassName, "w-full")}
						onKeyDown={(e) => e.key === "Enter" && handleWsAddMember()}
					/>
					<Select value={wsInviteRole} onValueChange={setWsInviteRole}>
						<SelectTrigger className={cn(formFieldClassName, "w-full")}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="member">成员</SelectItem>
							<SelectItem value="owner">所有者</SelectItem>
						</SelectContent>
					</Select>
					<Button
						onClick={handleWsAddMember}
						disabled={wsAdding || !wsInviteEmail.trim()}
						className={cn(formPrimaryButtonClassName, "w-full gap-2")}
					>
						{wsAdding ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<>
								<Plus className="h-4 w-4" />
								添加
							</>
						)}
					</Button>
				</div>

				{/* Members table */}
				{wsMembersQuery.isLoading ? (
					<div className="space-y-3 py-6">
						{WORKSPACE_MEMBER_SKELETON_KEYS.map((key) => (
							<div
								key={key}
								className={cn(
									formPanelClassName,
									"flex items-center justify-between px-4 py-3",
								)}
							>
								<div className="space-y-2">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-40" />
								</div>
								<Skeleton className="h-6 w-16 rounded-[var(--app-radius)]" />
							</div>
						))}
					</div>
				) : wsMembers.length === 0 ? (
					<div className={cn(formPanelClassName, "px-5 py-5 sm:px-6 sm:py-6")}>
						<EmptyStatePanel
							icon={Users}
							eyebrow="首位团队成员"
							title="邀请第一位团队成员"
							description="在同一工作区共享提问、运行计划和分析结果。"
							action={
								<Button
									variant="outline"
									onClick={() =>
										document
											.getElementById("invite-member-form")
											?.scrollIntoView({ behavior: "smooth", block: "start" })
									}
								>
									邀请团队成员
								</Button>
							}
							className="min-h-0"
							contentClassName="max-w-none px-0 py-0 text-left shadow-none"
						/>
					</div>
				) : (
					<div className="web-touch-scroll">
						<Table className="min-w-[32rem] lg:min-w-[38rem]">
							<TableHeader>
								<TableRow className="bg-gray-50/70 dark:bg-gray-900/40">
									<TableHead className="px-4 py-3">名称</TableHead>
									<TableHead className="px-4 py-3">邮箱</TableHead>
									<TableHead className="px-4 py-3">角色</TableHead>
									<TableHead className="px-4 py-3 w-20" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{wsMembers.map((member) => (
									<TableRow key={member.memberId}>
										<TableCell className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
											{member.userName}
										</TableCell>
										<TableCell className="px-4 py-3 text-sm whitespace-normal break-words [overflow-wrap:anywhere] text-gray-600 dark:text-gray-400">
											{member.userEmail}
										</TableCell>
										<TableCell className="px-4 py-3">
											<span
												className={`inline-flex items-center rounded-[var(--app-radius)] px-2 py-0.5 text-xs font-medium ${getRoleBadgeClass(member.role)}`}
											>
												{member.role}
											</span>
										</TableCell>
										<TableCell className="px-4 py-3">
											{member.role !== "owner" && (
												<Button
													variant="ghost"
													size="sm"
													onClick={() =>
														handleWsRemoveMember(member.userId, member.role)
													}
													className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</section>
		</div>
	);
}
