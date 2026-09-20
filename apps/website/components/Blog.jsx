"use client";

import { sitePath } from "../lib/paths.mjs";

import { Fragment } from "react";
import { CN, EN } from "../content/blog";
import { usePageState } from "../hooks/usePageState";

export default function Blog() {
	const [state, setState] = usePageState(
		{ lang: "zh", menuOpen: false, wide: true, cat: 0, limit: 6 },
		false,
	);
	const values = (() => {
		const t = state.lang === "zh" ? CN : EN;
		const wide = state.wide;
		const active = state.cat;
		const cats = t.cats.map((label, i) => ({
			label,
			onClick: () => setState({ cat: i }),
			border: i === active ? "rgba(240,169,59,.6)" : "rgba(94,140,165,.3)",
			bg: i === active ? "rgba(240,169,59,.14)" : "transparent",
			color: i === active ? "#F0A93B" : "#A9C0CE",
		}));
		const posts =
			active === 0 ? t.posts : t.posts.filter((p) => p.cat === t.cats[active]);
		return {
			t,
			cats,
			posts,
			featured: t.featured,
			navItems: t.nav,
			menuOpen: state.menuOpen,
			deskInline: wide ? "inline-block" : "none",
			burgerDisplay: wide ? "none" : "inline-block",
			toggleLang: () => {
				const next = state.lang === "zh" ? "en" : "zh";
				try {
					localStorage.setItem("jk_lang", next);
				} catch (e) {}
				setState({ lang: next });
			},
			toggleMenu: () => setState({ menuOpen: !state.menuOpen }),
			closeMenu: () => setState({ menuOpen: false }),
		};
	})();
	const {
		burgerDisplay,
		cats,
		closeMenu,
		deskInline,
		featured,
		menuOpen,
		navItems,
		posts,
		t,
		toggleLang,
		toggleMenu,
	} = values;
	return (
		<>
			<div className="jk-home-1">
				<header className="jk-header-2">
					<div className="jk-header-190">
						<a className="jk-header-4" href={sitePath("/")}>
							<span className="jk-header-191">
								<img
									className="jk-header-6"
									src={sitePath("/assets/logo.png")}
									alt={"见客 JianKe 品牌标识"}
								/>
							</span>
							<span className="jk-header-7">
								<span className="jk-header-192">{"见客"}</span>
								<span className="jk-header-9">{"JIANKE GEO"}</span>
							</span>
						</a>
						<nav className="jk-header-10">
							{navItems.map((item) => (
								<Fragment key={item.label}>
									<a
										className="jk-header-193"
										style={{ display: deskInline }}
										href={sitePath(item.href)}
										target={item.target}
									>
										{item.label}
									</a>
								</Fragment>
							))}
						</nav>
						<div className="jk-header-12">
							<button
								className="jk-header-194"
								onClick={toggleLang}
								type="button"
							>
								{t.langLabel}
							</button>
							<a
								className="jk-header-195"
								style={{ display: deskInline }}
								href={sitePath("/#contact")}
							>
								{t.cta}
							</a>
							<button
								className="jk-header-17"
								style={{ display: burgerDisplay }}
								onClick={toggleMenu}
								aria-label={"menu"}
								type="button"
								aria-expanded={menuOpen}
								aria-controls="mobile-menu"
							>
								{"≡"}
							</button>
						</div>
					</div>
				</header>
				{menuOpen && (
					<div className="jk-home-18" id="mobile-menu">
						{navItems.map((item) => (
							<Fragment key={item.label}>
								<a
									className="jk-home-19"
									href={sitePath(item.href)}
									target={item.target}
									onClick={closeMenu}
								>
									{item.label}
								</a>
							</Fragment>
						))}
						<a
							className="jk-liteservices-196"
							href={sitePath("/#contact")}
							onClick={closeMenu}
						>
							{t.cta}
						</a>
					</div>
				)}
				<main className="jk-main-22">
					<section>
						<div className="jk-main-240">
							<div className="jk-vision-71">{t.kicker}</div>
							<h1 className="jk-main-241">{t.title}</h1>
							<p className="jk-main-261">{t.lead}</p>
							<div className="jk-main-262">
								{cats.map((c) => (
									<Fragment key={c.label}>
										<button
											className="jk-main-263"
											style={{
												border: `1px solid ${c.border}`,
												background: c.bg,
												color: c.color,
											}}
											onClick={c.onClick}
											type="button"
										>
											{c.label}
										</button>
									</Fragment>
								))}
							</div>
						</div>
					</section>
					<section>
						<div className="jk-main-264">
							<article className="jk-article-265">
								<div>
									<div className="jk-article-266">
										{t.featuredLabel}
										{" · "}
										{featured.cat}
									</div>
									<h2 className="jk-article-267">{featured.title}</h2>
									<p className="jk-article-268">{featured.excerpt}</p>
									<div className="jk-clients-145">{featured.meta}</div>
									<a className="jk-article-269" href={sitePath(featured.href)}>
										{t.read}
									</a>
								</div>
								<div className="jk-article-270">
									<div className="jk-article-271">{t.tocLabel}</div>
									<div className="jk-article-272">
										{featured.toc.map((i) => (
											<Fragment key={i}>
												<div className="jk-article-273">
													<span className="jk-article-274">{"—"}</span>
													<span>{i}</span>
												</div>
											</Fragment>
										))}
									</div>
								</div>
							</article>
							<div className="jk-main-275">
								{posts.map((p) => (
									<Fragment key={p.title}>
										<a className="jk-main-276" href={sitePath(p.href)}>
											<div className="jk-main-277">{p.cat}</div>
											<div className="jk-main-278">{p.title}</div>
											<p className="jk-how-it-works-109">{p.excerpt}</p>
											<div className="jk-main-279">{p.meta}</div>
										</a>
									</Fragment>
								))}
							</div>
							<div className="jk-main-280">{t.moreNote}</div>
						</div>
					</section>
				</main>
				<footer className="jk-footer-161">
					<div className="jk-footer-234">
						<a className="jk-hero-56" href={sitePath("/")}>
							<span className="jk-footer-235">
								<img
									className="jk-header-6"
									src={sitePath("/assets/logo.png")}
									alt={"见客 JianKe 品牌标识"}
								/>
							</span>
							<span className="jk-footer-236">{"见客"}</span>
						</a>
						<div className="jk-footer-237">
							{navItems.map((item) => (
								<Fragment key={item.label}>
									<a
										className="jk-footer-238"
										href={sitePath(item.href)}
										target={item.target}
									>
										{item.label}
									</a>
								</Fragment>
							))}
						</div>
					</div>
					<div className="jk-footer-239">
						<span>{t.copy}</span>
						<span className="jk-footer-171">{t.icp}</span>
					</div>
				</footer>
			</div>
		</>
	);
}
