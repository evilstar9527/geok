"use client";

import { sitePath } from "../lib/paths.mjs";

import { Fragment } from "react";
import { CN, EN } from "../content/case-studies";
import { usePageState } from "../hooks/usePageState";

export default function CaseStudies() {
	const [state, setState] = usePageState(
		{ lang: "zh", menuOpen: false, wide: true },
		false,
	);
	const values = (() => {
		const t = state.lang === "zh" ? CN : EN;
		const wide = state.wide;
		return {
			t,
			cases: t.cases,
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
		cases,
		closeMenu,
		deskInline,
		menuOpen,
		navItems,
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
							<p className="jk-main-242">{t.lead}</p>
						</div>
					</section>
					<section>
						<div className="jk-main-243">
							{cases.map((c) => (
								<Fragment key={c.title}>
									<article className="jk-article-244">
										<div>
											<div className="jk-article-245">
												<span className="jk-article-246">{c.tag}</span>
												<span className="jk-article-247">{c.tier}</span>
											</div>
											<h2 className="jk-article-248">{c.title}</h2>
											<div className="jk-article-249">
												<div>
													<div className="jk-article-250">{t.labelProblem}</div>
													<p className="jk-article-251">{c.problem}</p>
												</div>
												<div>
													<div className="jk-article-250">{t.labelAction}</div>
													<div className="jk-article-252">
														{c.actions.map((a) => (
															<Fragment key={a}>
																<div className="jk-article-253">
																	<span className="jk-service-tiers-120">
																		{"▸"}
																	</span>
																	<span>{a}</span>
																</div>
															</Fragment>
														))}
													</div>
												</div>
											</div>
										</div>
										<div className="jk-article-254">
											<div className="jk-article-250">{t.labelResult}</div>
											<div className="jk-article-255">
												{c.metrics.map((m) => (
													<Fragment key={m.k}>
														<div className="jk-article-256">
															<div className="jk-hero-34">{m.v}</div>
															<div className="jk-article-257">{m.k}</div>
														</div>
													</Fragment>
												))}
											</div>
											<blockquote className="jk-article-258">
												{c.quote}
											</blockquote>
											<div className="jk-main-199">{c.who}</div>
										</div>
									</article>
								</Fragment>
							))}
							<p className="jk-main-259">{t.disclaimer}</p>
						</div>
					</section>
					<section className="jk-main-260">
						<div className="jk-main-229">
							<h2 className="jk-main-230">{t.endTitle}</h2>
							<p className="jk-main-231">{t.endBody}</p>
							<div className="jk-main-232">
								<a className="jk-main-233" href={sitePath("/#contact")}>
									{t.cta}
								</a>
								<a
									className="jk-contact-160"
									href={sitePath("/services-lite/")}
								>
									{t.liteCta}
								</a>
							</div>
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
