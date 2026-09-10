"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches errors thrown by the root layout itself, which
 * error.tsx cannot see. It replaces the root layout, so neither globals.css nor
 * the locale provider is mounted here — everything below is inline-styled and
 * hardcoded rather than styled with Tailwind classes or `t()`.
 */
export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("[app] root layout error", error);
	}, [error]);

	return (
		<html lang="zh-CN">
			<body
				style={{
					margin: 0,
					minHeight: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: "24px",
					background: "#fafaf9",
					color: "#18181b",
					fontFamily:
						"system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
				}}
			>
				<div style={{ maxWidth: "32rem", textAlign: "center" }}>
					<h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600 }}>
						页面加载失败
					</h1>
					<p
						style={{ marginTop: "0.75rem", lineHeight: 1.6, color: "#71717a" }}
					>
						应用遇到了意外的服务端错误，请刷新页面重试。
					</p>
					{error.digest ? (
						<p
							style={{
								marginTop: "0.75rem",
								fontSize: "0.75rem",
								color: "#a1a1aa",
								fontFamily: "ui-monospace, SFMono-Regular, monospace",
							}}
						>
							错误编号: {error.digest}
						</p>
					) : null}
					<button
						type="button"
						onClick={reset}
						style={{
							marginTop: "1.75rem",
							padding: "0.625rem 1.25rem",
							fontSize: "0.875rem",
							fontWeight: 600,
							color: "#ffffff",
							background: "#18181b",
							border: "none",
							borderRadius: "0.5rem",
							cursor: "pointer",
						}}
					>
						重试
					</button>
				</div>
			</body>
		</html>
	);
}
