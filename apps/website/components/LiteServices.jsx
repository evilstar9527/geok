"use client";

import { TOOL_URL, sitePath } from "../lib/paths.mjs";

import { Fragment } from "react";
import { CN, EN } from "../content/services-lite";
import { usePageState } from "../hooks/usePageState";

export default function LiteServices() {
	const [state, setState] = usePageState(
		{ lang: "zh", menuOpen: false, wide: true },
		false,
	);
	const values = (() => {
		const t = state.lang === "zh" ? CN : EN;
		const wide = state.wide;
		return {
			t,
			navItems: t.nav,
			fits: t.fits,
			deliverables: t.deliverables,
			flow: t.flow,
			faqs: t.faqs,
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
		closeMenu,
		deliverables,
		deskInline,
		faqs,
		fits,
		flow,
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
					<section className="jk-main-197">
						<div className="jk-main-198">
							<div className="jk-main-199">
								<a href={sitePath("/")}>{t.crumbHome}</a>
								{" / "}
								<a href={sitePath("/#service-tiers")}>{t.crumbServices}</a>
								{" / "}
								<span className="jk-main-200">{t.crumbHere}</span>
							</div>
							<h1 className="jk-main-201">{t.title}</h1>
							<p className="jk-main-202">{t.lead}</p>
							<div className="jk-main-203">
								<a className="jk-main-204" href={sitePath("/#contact")}>
									{t.cta}
								</a>
								<a className="jk-main-205" href={sitePath("/#service-tiers")}>
									{t.compareCta}
								</a>
							</div>
						</div>
					</section>
					<section className="jk-main-206">
						<div className="jk-main-207">
							<h2 className="jk-main-208">{t.fitTitle}</h2>
							<div className="jk-main-209">
								{fits.map((f) => (
									<Fragment key={f.title}>
										<div className="jk-what-is-geo-100">
											<div className="jk-main-210">{f.title}</div>
											<p className="jk-main-211">{f.body}</p>
										</div>
									</Fragment>
								))}
							</div>
						</div>
					</section>
					<section className="jk-vision-69">
						<div className="jk-main-212">
							<div>
								<h2 className="jk-main-208">{t.deliverTitle}</h2>
								<div className="jk-main-213">
									{deliverables.map((d) => (
										<Fragment key={d.k}>
											<div className="jk-main-214">
												<span className="jk-service-tiers-120">{"▸"}</span>
												<div>
													<div className="jk-main-215">{d.k}</div>
													<div className="jk-main-216">{d.v}</div>
												</div>
											</div>
										</Fragment>
									))}
								</div>
							</div>
							<div>
								<h2 className="jk-main-208">{t.flowTitle}</h2>
								<div className="jk-main-217">
									{flow.map((s) => (
										<Fragment key={s.n}>
											<div className="jk-main-218">
												<div className="jk-main-219">
													<span className="jk-main-220">{s.n}</span>
													<span className="jk-main-221" />
												</div>
												<div>
													<div className="jk-vision-85">{s.title}</div>
													<div className="jk-main-222">{s.body}</div>
													<div className="jk-main-223">{s.time}</div>
												</div>
											</div>
										</Fragment>
									))}
								</div>
							</div>
						</div>
					</section>
					<section className="jk-main-206">
						<div className="jk-main-224">
							<h2 className="jk-main-208">{t.faqTitle}</h2>
							<div className="jk-main-225">
								{faqs.map((f) => (
									<Fragment key={f.q}>
										<div className="jk-main-226">
											<div className="jk-main-227">{f.q}</div>
											<p className="jk-main-228">{f.a}</p>
										</div>
									</Fragment>
								))}
							</div>
						</div>
					</section>
					<section className="jk-vision-69">
						<div className="jk-main-229">
							<h2 className="jk-main-230">{t.endTitle}</h2>
							<p className="jk-main-231">{t.endBody}</p>
							<div className="jk-main-232">
								<a className="jk-main-233" href={sitePath("/#contact")}>
									{t.cta}
								</a>
								<a
									className="jk-contact-160"
									href={sitePath(TOOL_URL)}
									target={"_blank"}
									rel="noopener noreferrer"
								>
									{t.tool}
									{" ↗"}
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
