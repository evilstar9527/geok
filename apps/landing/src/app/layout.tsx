import "./globals.css";
import {
	GITHUB_URL,
	SITE_DESCRIPTION,
	SITE_LINKS,
	SITE_NAME,
	SITE_URL,
	UPSTREAM,
} from "@/lib/site";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist } from "next/font/google";

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

const SITE_TITLE = `${SITE_NAME} | 开源 GEO 与 AI 可见度追踪工具`;

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: SITE_TITLE,
	description: SITE_DESCRIPTION,
	keywords: [
		"GEO",
		"generative engine optimization",
		"生成式引擎优化",
		"AI 可见度",
		"AI visibility",
		"AI visibility tracker",
		"AI visibility tracking",
		"品牌 AI 可见度监测",
		"国产大模型品牌监测",
		"豆包 品牌监测",
		"DeepSeek 品牌监测",
		"GEO 工具",
		"open source GEO tool",
		"self-hosted GEO",
		"LLM visibility",
		"AI search optimization",
		"AI mention tracking",
		"geok",
	],
	alternates: {
		canonical: SITE_URL,
	},
	icons: {
		icon: [
			{
				url: "/logo.png",
				media: "(prefers-color-scheme: light)",
				type: "image/png",
			},
			{
				url: "/logo-dark.png",
				media: "(prefers-color-scheme: dark)",
				type: "image/png",
			},
		],
		shortcut: [
			{
				url: "/logo.png",
				type: "image/png",
			},
		],
		apple: [
			{
				url: "/logo.png",
				type: "image/png",
			},
		],
	},
	openGraph: {
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		url: SITE_URL,
		siteName: SITE_NAME,
		type: "website",
		images: [
			{
				url: "/opengraph-image",
				width: 1200,
				height: 630,
				alt: `${SITE_NAME} 开源 AI 可见度追踪`,
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		images: ["/twitter-image"],
	},
};

const jsonLd = {
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	name: SITE_NAME,
	url: SITE_URL,
	description: SITE_DESCRIPTION,
	applicationCategory: "BusinessApplication",
	operatingSystem: "Linux, macOS, Windows",
	offers: {
		"@type": "Offer",
		price: "0",
		priceCurrency: "USD",
	},
	license: "https://opensource.org/licenses/MIT",
	codeRepository: GITHUB_URL,
	// Explicit fork attribution: GEOK's own identity stays separate from the
	// upstream project it was forked from, instead of the two merging into one
	// entity in an AI engine's knowledge graph.
	isBasedOn: {
		"@type": "SoftwareApplication",
		name: UPSTREAM.name,
		url: UPSTREAM.url,
		license: `https://opensource.org/licenses/${UPSTREAM.license}`,
	},
	featureList: [
		"追踪品牌在 11 个 AI 渠道生成回答中的可见度",
		"覆盖豆包、DeepSeek、Kimi、元宝、千问、点点 6 个国产大模型",
		"GEO 评分：可见度、排名位置、情感倾向、推荐类型",
		"竞品共现分析与引用来源追踪",
		"基于真实浏览器界面抓取，而非模型 API",
		"完全自托管，数据不出本地",
	],
	author: {
		"@type": "Organization",
		name: SITE_NAME,
		url: SITE_URL,
		sameAs: [GITHUB_URL],
	},
	sameAs: [GITHUB_URL, SITE_LINKS.docs],
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
	return (
		<html lang="zh-CN" className={geist.variable} suppressHydrationWarning>
			<body>
				<script
					type="application/ld+json"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: structured data for search engines
					dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
				/>
				{children}
				<Analytics />
			</body>
		</html>
	);
}
