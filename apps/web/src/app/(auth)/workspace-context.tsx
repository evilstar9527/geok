"use client";

import type { Workspace } from "@oneglanse/db";
import { createContext, useContext } from "react";

type WorkspaceContextValue = {
	workspace: Workspace | null;
	userEmail: string;
	isAdministrator: boolean;
};

const WorkspaceContext = createContext<WorkspaceContextValue>({
	workspace: null,
	userEmail: "",
	isAdministrator: false,
});

export function WorkspaceProvider({
	workspace,
	userEmail,
	isAdministrator,
	children,
}: {
	workspace: Workspace | null;
	userEmail: string;
	isAdministrator: boolean;
	children: React.ReactNode;
}) {
	return (
		<WorkspaceContext.Provider
			value={{ workspace, userEmail, isAdministrator }}
		>
			{children}
		</WorkspaceContext.Provider>
	);
}

export function useLayoutWorkspace(): Workspace | null {
	return useContext(WorkspaceContext).workspace;
}

export function useLayoutUserEmail(): string {
	return useContext(WorkspaceContext).userEmail;
}

export function useIsAdministrator(): boolean {
	return useContext(WorkspaceContext).isAdministrator;
}
