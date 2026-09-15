import { GITHUB_URL, SITE_NAME, SITE_URL } from "@/lib/site";
import Link from "next/link";

export type ArticleFaq = { q: string; a: string };
export type ArticleSource = { label: string; url: string; date: string };

type ArticleLayoutProps = {
	slug: string;
	title: string;
	description: string;
	updated: string;
	/** 直接答案：2-4 句，放在正文之前，AI 最常在这里截取（GEO 原则 1）。 */
	directAnswer: string;
	faq: ArticleFaq[];
	sources: ArticleSource[];
	children: React.ReactNode;
};

// 用问题原句做锚点，便于 AI 把用户提问匹配到具体小节（GEO 原则 4）。
const slugify = (value: string): string =>
	value
		.toLowerCase()
		.replace(/[^\p{Script=Han}a-z0-9]+/gu, "-")
		.replace(/^-|-$/g, "");

export function ArticleLayout({
	slug,
	title,
	description,
	updated,
	directAnswer,
	faq,
	sources,
	children,
}: ArticleLayoutProps): React.JSX.Element {
	const url = `${SITE_URL}/blog/${slug}`;

	const jsonLd = {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "Article",
				headline: title,
				description,
				inLanguage: "zh-CN",
				datePublished: updated,
				dateModified: updated,
				mainEntityOfPage: url,
				author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
				publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
			},
			{
				"@type": "FAQPage",
				mainEntity: faq.map((item) => ({
					"@type": "Question",
					name: item.q,
					acceptedAnswer: { "@type": "Answer", text: item.a },
				})),
			},
		],
	};

	return (
		<main className="section-shell py-10 sm:py-14">
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: structured data for search engines
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>

			<Link
				href="/blog"
				className="text-sm text-muted-foreground hover:text-foreground"
			>
				← 全部文章
			</Link>

			<article lang="zh-CN" className="mt-6 max-w-3xl">
				<header>
					<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
						{title}
					</h1>
					<p className="mt-3 text-sm text-muted-foreground">
						最后更新：
						<time dateTime={updated}>{updated}</time>
					</p>
				</header>

				{/* 直接答案：不放进 prose，避免被当成普通段落而稀释（GEO 原则 1）。 */}
				<div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
					<p className="text-base font-medium leading-7">{directAnswer}</p>
				</div>

				<div className="prose prose-gray mt-8 max-w-none dark:prose-invert">
					{children}
				</div>

				<section className="mt-12" aria-labelledby="faq-title">
					<h2 id="faq-title" className="text-2xl font-semibold tracking-tight">
						常见问题
					</h2>
					<dl className="mt-4 space-y-5">
						{faq.map((item) => (
							<div key={item.q} id={slugify(item.q)}>
								<dt className="text-base font-semibold">{item.q}</dt>
								<dd className="mt-1.5 leading-7 text-muted-foreground">
									{item.a}
								</dd>
							</div>
						))}
					</dl>
				</section>

				<section className="mt-12" aria-labelledby="sources-title">
					<h2
						id="sources-title"
						className="text-2xl font-semibold tracking-tight"
					>
						数据来源
					</h2>
					<ul className="mt-4 space-y-2 text-sm text-muted-foreground">
						{sources.map((source) => (
							<li key={source.url}>
								<a
									href={source.url}
									className="underline hover:text-foreground"
									target="_blank"
									rel="noreferrer noopener"
								>
									{source.label}
								</a>
								<span className="ml-1">（{source.date}）</span>
							</li>
						))}
					</ul>
				</section>

				<section className="mt-12 rounded-lg border border-gray-200 p-5 dark:border-gray-800">
					<h2 className="text-lg font-semibold">用 GEOK 自己跑一遍这套方法</h2>
					<p className="mt-2 text-sm leading-6 text-muted-foreground">
						GEOK 覆盖 ChatGPT、Gemini、Perplexity、Claude、Google AI Overview
						与豆包、DeepSeek、Kimi、元宝、千问、点点共 11
						个渠道，输出可见度、排名、情感与推荐类型评分，可自托管、代码开源。
					</p>
					<div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
						<a
							href={GITHUB_URL}
							className="rounded-md bg-gray-900 px-4 py-2 text-white dark:bg-gray-100 dark:text-gray-900"
							target="_blank"
							rel="noreferrer noopener"
						>
							查看 GitHub
						</a>
						<Link
							href="/#supported-providers"
							className="rounded-md border border-gray-300 px-4 py-2 dark:border-gray-700"
						>
							支持的渠道
						</Link>
					</div>
				</section>
			</article>
		</main>
	);
}
