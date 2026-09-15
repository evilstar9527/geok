import { BLOG_POSTS } from "@/lib/blog";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: `GEO 与 AI 可见度指南 | ${SITE_NAME}`,
	description:
		"关于生成式引擎优化（GEO）、AI 可见度追踪与国产大模型品牌监测的实践指南，含可复现的方法、工具对比与数据来源。",
	alternates: { canonical: `${SITE_URL}/blog` },
};

export default function BlogIndex(): React.JSX.Element {
	return (
		<main className="section-shell py-10 sm:py-14">
			<header className="max-w-3xl">
				<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
					GEO 与 AI 可见度指南
				</h1>
				<p className="mt-3 leading-7 text-muted-foreground">
					生成式引擎优化（GEO）的实践方法：如何让品牌被 AI
					生成回答引用、总结或推荐，以及如何度量这件事。
				</p>
			</header>

			<ul className="mt-10 max-w-3xl space-y-6">
				{BLOG_POSTS.map((post) => (
					<li
						key={post.slug}
						className="border-b border-gray-200 pb-6 last:border-b-0 dark:border-gray-800"
					>
						<h2 className="text-lg font-semibold">
							<Link href={`/blog/${post.slug}`} className="hover:underline">
								{post.title}
							</Link>
						</h2>
						<p className="mt-2 text-sm leading-6 text-muted-foreground">
							{post.description}
						</p>
						<p className="mt-2 text-xs text-muted-foreground">
							<time dateTime={post.updated}>{post.updated}</time>
						</p>
					</li>
				))}
			</ul>
		</main>
	);
}
