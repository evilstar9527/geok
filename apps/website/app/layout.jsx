import "./globals.css";
import { sitePath } from "../lib/paths.mjs";

export const metadata = {
	title: {
		default: "见客 JianKe — AI 时代，先被看见，才有生意",
		template: "%s | 见客 JianKe",
	},
	description:
		"见客提供 GEO 服务与 AI 可见度监测，帮助品牌在 AI 回答中被看见、理解和引用。",
};

export default function RootLayout({ children }) {
	return (
		<html lang="zh-CN" suppressHydrationWarning>
			<head>
				<link rel="icon" href={sitePath("/assets/logo.png")} />
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Noto+Sans+SC:wght@400;500;700;900&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body>{children}</body>
		</html>
	);
}
