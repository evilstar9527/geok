import type { ReactNode } from "react";
import { BrandWordmark } from "../brand-wordmark";
import styles from "./auth-page-shell.module.css";

type AuthPageShellProps = {
	children: ReactNode;
	subtitle?: string;
};

export function AuthPageShell({
	children,
	subtitle,
}: AuthPageShellProps): React.JSX.Element {
	return (
		<main className={styles.page}>
			<div className={styles.frame}>
				<header className={styles.brand}>
					<BrandWordmark className={styles.wordmark} />
					{subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
				</header>
				<div className={styles.content}>{children}</div>
				<p className={styles.note}>使用管理员为你创建的账号登录</p>
			</div>
		</main>
	);
}
