"use client";

import { TOOL_URL, sitePath } from "../lib/paths.mjs";

import { Fragment } from "react";
import { CN, EN } from "../content/index";
import { usePageState } from "../hooks/usePageState";
import ReportCard from "./ReportCard";

export default function Home({ report }) {
	const [state, setState] = usePageState(
		{
			lang: "zh",
			menuOpen: false,
			modalOpen: false,
			submitted: false,
			active: "hero",
			wide: true,
		},
		true,
	);
	const values = (() => {
		const zh = state.lang === "zh";
		const t = zh ? CN : EN;
		const wide = state.wide;
		const toolUrl = TOOL_URL;

		const navItems = t.nav.map((n) => ({
			href: n.href,
			label: n.label,
			color: state.active === n.id ? "#F0A93B" : "#B7CBD7",
		}));

		const tiers = t.tiers.map((p) => ({
			...p,
			border: p.badge ? "rgba(240,169,59,.5)" : "rgba(94,140,165,.26)",
			bg: p.badge
				? "linear-gradient(165deg,rgba(240,169,59,.1),rgba(14,36,48,.6))"
				: "rgba(14,36,48,.45)",
			btnBg: p.badge ? "#F0A93B" : "transparent",
			btnFg: p.badge ? "#10222D" : "#E7EEF3",
		}));

		const platformGroups = t.platGroups.map((g) => ({
			label: g.label,
			items: g.items.map((n) => ({ n, i: n.slice(0, 2).toUpperCase() })),
		}));

		const footerCols = [
			{
				title: t.footColTitles[0],
				links: [
					{
						label: zh ? "轻量版服务" : "Lite tier",
						href: "/services-lite/",
						target: "_self",
					},
					{
						label: zh ? "标准版 / 旗舰版" : "Standard / Flagship",
						href: "#service-tiers",
						target: "_self",
					},
					{ label: t.navTool, href: toolUrl, target: "_blank" },
				],
			},
			{
				title: t.footColTitles[1],
				links: [
					{ label: zh ? "愿景" : "Vision", href: "#vision", target: "_self" },
					{
						label: zh ? "什么是 GEO" : "What is GEO",
						href: "#what-is-geo",
						target: "_self",
					},
					{ label: zh ? "关于我们" : "About", href: "#about", target: "_self" },
					{
						label: zh ? "联系我们" : "Contact",
						href: "#contact",
						target: "_self",
					},
				],
			},
			{
				title: t.footColTitles[2],
				links: [
					{ label: t.navBlog, href: "/blog/", target: "_self" },
					{ label: t.navCases, href: "/case-studies/", target: "_self" },
					{
						label: zh ? "行业洞察数据" : "Market data",
						href: "#insight",
						target: "_self",
					},
				],
			},
		];

		return {
			t,
			toolUrl,
			navItems,
			tiers,
			platformGroups,
			footerCols,
			wide,
			stripLabel: zh
				? "已覆盖主流 AI 回答引擎"
				: "Tracked across every major AI answer engine",
			deskInline: wide ? "inline-block" : "none",
			deskFlex: wide ? "flex" : "none",
			burgerDisplay: wide ? "none" : "inline-block",
			heroStats: t.heroStats,
			visionSteps: t.visionSteps,
			insightCards: t.insightCards,
			geoDims: t.geoDims,
			engines: t.engines,
			compareRows: t.compareRows,
			clientLogos: t.clientLogos,
			testimonials: t.testimonials,
			aboutStats: t.aboutStats,
			formFields: t.formFields,
			stripPlatforms: [
				"ChatGPT",
				"DeepSeek",
				zh ? "豆包" : "Doubao",
				"Kimi",
				"Gemini",
				"Perplexity",
				zh ? "通义千问" : "Qwen",
				"Copilot",
			].map((n) => ({ n, i: n.slice(0, 2).toUpperCase() })),
			menuOpen: state.menuOpen,
			modalOpen: state.modalOpen,
			submitted: state.submitted,
			notSubmitted: !state.submitted,
			toggleLang: () => {
				const next = state.lang === "zh" ? "en" : "zh";
				try {
					localStorage.setItem("jk_lang", next);
				} catch (e) {}
				setState({ lang: next });
			},
			toggleMenu: () => setState({ menuOpen: !state.menuOpen }),
			closeMenu: () => setState({ menuOpen: false }),
			openModal: () =>
				setState({ modalOpen: true, submitted: false, menuOpen: false }),
			openModalFromMenu: () =>
				setState({ modalOpen: true, submitted: false, menuOpen: false }),
			closeModal: () => setState({ modalOpen: false }),
			onOverlayClick: () => setState({ modalOpen: false }),
			stop: (e) => e.stopPropagation(),
			onSubmit: (e) => {
				e.preventDefault();
				setState({ submitted: true });
			},
		};
	})();
	const {
		aboutStats,
		burgerDisplay,
		clientLogos,
		closeMenu,
		closeModal,
		compareRows,
		deskFlex,
		deskInline,
		engines,
		footerCols,
		formFields,
		geoDims,
		heroStats,
		insightCards,
		menuOpen,
		modalOpen,
		navItems,
		notSubmitted,
		onOverlayClick,
		onSubmit,
		openModal,
		openModalFromMenu,
		platformGroups,
		stop,
		stripLabel,
		stripPlatforms,
		submitted,
		t,
		testimonials,
		tiers,
		toggleLang,
		toggleMenu,
		toolUrl,
		visionSteps,
	} = values;
	return (
		<>
			<div className="jk-home-1">
				<header className="jk-header-2">
					<div className="jk-header-3">
						<a className="jk-header-4" href={sitePath("/")}>
							<span className="jk-header-5">
								<img
									className="jk-header-6"
									src={sitePath("/assets/logo.png")}
									alt={"见客 JianKe 品牌标识"}
								/>
							</span>
							<span className="jk-header-7">
								<span className="jk-header-8">{"见客"}</span>
								<span className="jk-header-9">{"JIANKE GEO"}</span>
							</span>
						</a>
						<nav className="jk-header-10">
							{navItems.map((item) => (
								<Fragment key={item.label}>
									<a
										className="jk-header-11"
										style={{ display: deskInline, color: item.color }}
										href={sitePath(item.href)}
									>
										{item.label}
									</a>
								</Fragment>
							))}
						</nav>
						<div className="jk-header-12">
							<button
								className="jk-header-13"
								onClick={toggleLang}
								type="button"
							>
								{t.langLabel}
							</button>
							<a
								className="jk-header-14"
								style={{ display: deskFlex }}
								href={sitePath(toolUrl)}
								target={"_blank"}
								rel="noopener noreferrer"
							>
								{t.navTool} <span className="jk-header-15">{"↗"}</span>
							</a>
							<button
								className="jk-header-16"
								style={{ display: deskInline }}
								onClick={openModal}
								type="button"
							>
								{t.ctaPrimary}
							</button>
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
									onClick={closeMenu}
								>
									{item.label}
								</a>
							</Fragment>
						))}
						<a
							className="jk-home-19"
							href={sitePath("/blog/")}
							onClick={closeMenu}
						>
							{t.navBlog}
						</a>
						<a
							className="jk-home-19"
							href={sitePath("/case-studies/")}
							onClick={closeMenu}
						>
							{t.navCases}
						</a>
						<a
							className="jk-home-20"
							href={sitePath(toolUrl)}
							target={"_blank"}
							rel="noopener noreferrer"
							onClick={closeMenu}
						>
							{t.navTool}
							{" ↗"}
						</a>
						<button
							className="jk-home-21"
							onClick={openModalFromMenu}
							type="button"
						>
							{t.ctaPrimary}
						</button>
					</div>
				)}
				<main className="jk-main-22">
					<section className="jk-hero-23" id={"hero"}>
						<div className="jk-hero-24">
							<div>
								<div className="jk-hero-25">
									<span className="jk-hero-26" />
									{t.heroBadge}
									{"\n      "}
								</div>
								<h1 className="jk-hero-27">{t.heroTitle}</h1>
								<p className="jk-hero-28">{t.heroSub}</p>
								<div className="jk-hero-29">
									<button
										className="jk-hero-30"
										onClick={openModal}
										type="button"
									>
										{t.heroCta1}
									</button>
									<a
										className="jk-hero-31"
										href={sitePath(toolUrl)}
										target={"_blank"}
										rel="noopener noreferrer"
									>
										{t.heroCta2} <span className="jk-hero-32">{"↗"}</span>
									</a>
								</div>
								<div className="jk-hero-33">
									{heroStats.map((s) => (
										<Fragment key={s.k}>
											<div>
												<div className="jk-hero-34">{s.v}</div>
												<div className="jk-hero-35">{s.k}</div>
											</div>
										</Fragment>
									))}
								</div>
							</div>
							<div className="jk-hero-36">
								<ReportCard report={report} lang={state.lang} />
							</div>
						</div>
					</section>
					<section className="jk-main-62">
						<div className="jk-main-63">
							<div className="jk-main-64">{stripLabel}</div>
							<div className="jk-main-65">
								{stripPlatforms.map((p) => (
									<Fragment key={p.n}>
										<span className="jk-main-66">
											<span className="jk-main-67">{p.i}</span>
											<span className="jk-main-68">{p.n}</span>
										</span>
									</Fragment>
								))}
							</div>
						</div>
					</section>
					<section className="jk-vision-69" id={"vision"}>
						<div className="jk-vision-70">
							<div className="jk-vision-71">{t.visionKicker}</div>
							<h2 className="jk-vision-72">{t.visionTitle}</h2>
							<div className="jk-vision-73">
								<div className="jk-vision-74">
									<div className="jk-vision-75">{t.pastLabel}</div>
									<div className="jk-vision-76">{t.pastTitle}</div>
									<p className="jk-vision-77">{t.pastBody}</p>
								</div>
								<div className="jk-vision-78">
									<div className="jk-vision-79">{t.futureLabel}</div>
									<div className="jk-vision-80">{t.futureTitle}</div>
									<p className="jk-vision-81">{t.futureBody}</p>
								</div>
							</div>
							<div className="jk-vision-82">
								{visionSteps.map((s) => (
									<Fragment key={s.n}>
										<div className="jk-vision-83">
											<div className="jk-vision-84">{s.n}</div>
											<div>
												<div className="jk-vision-85">{s.title}</div>
												<p className="jk-vision-86">{s.body}</p>
											</div>
										</div>
									</Fragment>
								))}
							</div>
						</div>
					</section>
					<section className="jk-insight-87" id={"insight"}>
						<div className="jk-vision-70">
							<div className="jk-insight-88">
								<div>
									<div className="jk-vision-71">{t.insightKicker}</div>
									<h2 className="jk-insight-89">{t.insightTitle}</h2>
								</div>
								<div className="jk-insight-90">{t.insightUpdated}</div>
							</div>
							<div className="jk-insight-91">
								{insightCards.map((c) => (
									<Fragment key={c.k}>
										<div className="jk-insight-92">
											<div className="jk-insight-93">{c.v}</div>
											<div className="jk-insight-94">{c.k}</div>
											<p className="jk-insight-95">{c.d}</p>
											<div className="jk-insight-96">{c.src}</div>
										</div>
									</Fragment>
								))}
							</div>
							<p className="jk-insight-97">{t.insightDisclaimer}</p>
						</div>
					</section>
					<section className="jk-vision-69" id={"what-is-geo"}>
						<div className="jk-vision-70">
							<div className="jk-vision-71">{t.geoKicker}</div>
							<h2 className="jk-insight-89">{t.geoTitle}</h2>
							<p className="jk-what-is-geo-98">{t.geoLead}</p>
							<div className="jk-what-is-geo-99">
								{geoDims.map((d) => (
									<Fragment key={d.title}>
										<div className="jk-what-is-geo-100">
											<div className="jk-what-is-geo-101">{d.tag}</div>
											<div className="jk-what-is-geo-102">{d.title}</div>
											<div className="jk-what-is-geo-103">{d.q}</div>
											<div className="jk-what-is-geo-104">{d.a}</div>
										</div>
									</Fragment>
								))}
							</div>
						</div>
					</section>
					<section className="jk-insight-87" id={"how-it-works"}>
						<div className="jk-vision-70">
							<div className="jk-vision-71">{t.howKicker}</div>
							<h2 className="jk-insight-89">{t.howTitle}</h2>
							<div className="jk-how-it-works-105">
								{engines.map((e) => (
									<Fragment key={e.no}>
										<div className="jk-how-it-works-106">
											<div className="jk-how-it-works-107">{e.no}</div>
											<div className="jk-how-it-works-108">{e.title}</div>
											<p className="jk-how-it-works-109">{e.body}</p>
											<div className="jk-how-it-works-110">
												{e.tags.map((tg) => (
													<Fragment key={tg}>
														<span className="jk-how-it-works-111">{tg}</span>
													</Fragment>
												))}
											</div>
										</div>
									</Fragment>
								))}
							</div>
						</div>
					</section>
					<section className="jk-vision-69" id={"service-tiers"}>
						<div className="jk-vision-70">
							<div className="jk-vision-71">{t.tierKicker}</div>
							<h2 className="jk-insight-89">{t.tierTitle}</h2>
							<div className="jk-service-tiers-112">
								{tiers.map((p) => (
									<Fragment key={p.name}>
										<div
											className="jk-service-tiers-113"
											style={{
												border: `1px solid ${p.border}`,
												background: p.bg,
											}}
										>
											<div className="jk-hero-56">
												<div className="jk-service-tiers-114">{p.name}</div>
												{p.badge && (
													<span className="jk-service-tiers-115">
														{p.badge}
													</span>
												)}
											</div>
											<div className="jk-service-tiers-116">{p.who}</div>
											<div className="jk-service-tiers-117">{p.price}</div>
											<div className="jk-service-tiers-118">
												{p.items.map((it) => (
													<Fragment key={it}>
														<div className="jk-service-tiers-119">
															<span className="jk-service-tiers-120">
																{"▸"}
															</span>
															<span>{it}</span>
														</div>
													</Fragment>
												))}
											</div>
											<a
												className="jk-service-tiers-121"
												style={{
													background: p.btnBg,
													color: p.btnFg,
													border: `1px solid ${p.border}`,
												}}
												href={sitePath(p.href)}
											>
												{p.cta}
											</a>
										</div>
									</Fragment>
								))}
							</div>
						</div>
					</section>
					<section className="jk-insight-87" id={"platforms"}>
						<div className="jk-vision-70">
							<div className="jk-vision-71">{t.platKicker}</div>
							<h2 className="jk-insight-89">{t.platTitle}</h2>
							{platformGroups.map((g) => (
								<Fragment key={g.label}>
									<div className="jk-platforms-122">
										<div className="jk-platforms-123">{g.label}</div>
										<div className="jk-platforms-124">
											{g.items.map((p) => (
												<Fragment key={p.n}>
													<div className="jk-platforms-125">
														<span className="jk-platforms-126">{p.i}</span>
														<span className="jk-platforms-127">{p.n}</span>
													</div>
												</Fragment>
											))}
										</div>
									</div>
								</Fragment>
							))}
						</div>
					</section>
					<section className="jk-vision-69" id={"why-us"}>
						<div className="jk-vision-70">
							<div className="jk-vision-71">{t.whyKicker}</div>
							<h2 className="jk-insight-89">{t.whyTitle}</h2>
							<div className="jk-why-us-128">
								<table className="jk-why-us-129">
									<thead>
										<tr className="jk-why-us-130">
											<th className="jk-why-us-131">{t.whyColDim}</th>
											<th className="jk-why-us-132">{t.whyColUs}</th>
											<th className="jk-why-us-133">{t.whyColSeo}</th>
											<th className="jk-why-us-133">{t.whyColMon}</th>
										</tr>
									</thead>
									<tbody>
										{compareRows.map((r) => (
											<Fragment key={r.dim}>
												<tr className="jk-vision-69">
													<td className="jk-why-us-134">{r.dim}</td>
													<td className="jk-why-us-135">{r.us}</td>
													<td className="jk-why-us-134">{r.seo}</td>
													<td className="jk-why-us-134">{r.mon}</td>
												</tr>
											</Fragment>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</section>
					<section className="jk-insight-87" id={"clients"}>
						<div className="jk-vision-70">
							<div className="jk-insight-88">
								<div>
									<div className="jk-vision-71">{t.cliKicker}</div>
									<h2 className="jk-insight-89">{t.cliTitle}</h2>
								</div>
								<a className="jk-clients-136" href={sitePath("/case-studies/")}>
									{t.cliMore}
									{" →"}
								</a>
							</div>
							<div className="jk-clients-137">
								{clientLogos.map((c) => (
									<Fragment key={c}>
										<div className="jk-clients-138">
											<span className="jk-clients-139" />
											<span className="jk-clients-140">{c}</span>
										</div>
									</Fragment>
								))}
							</div>
							<div className="jk-clients-141">
								{testimonials.map((tm) => (
									<Fragment key={tm.who}>
										<figure className="jk-clients-142">
											<div className="jk-clients-143">{tm.tag}</div>
											<blockquote className="jk-clients-144">
												{tm.quote}
											</blockquote>
											<figcaption className="jk-clients-145">
												{tm.who}
											</figcaption>
										</figure>
									</Fragment>
								))}
							</div>
							<p className="jk-clients-146">{t.cliDisclaimer}</p>
						</div>
					</section>
					<section className="jk-vision-69" id={"about"}>
						<div className="jk-about-147">
							<div>
								<div className="jk-vision-71">{t.aboutKicker}</div>
								<h2 className="jk-insight-89">{t.aboutTitle}</h2>
								<p className="jk-about-148">{t.aboutP1}</p>
								<p className="jk-about-149">{t.aboutP2}</p>
							</div>
							<div className="jk-about-150">
								{aboutStats.map((s) => (
									<Fragment key={s.k}>
										<div className="jk-about-151">
											<div className="jk-about-152">{s.v}</div>
											<div className="jk-about-153">{s.k}</div>
										</div>
									</Fragment>
								))}
							</div>
						</div>
					</section>
					<section className="jk-contact-154" id={"contact"}>
						<div className="jk-contact-155">
							<h2 className="jk-contact-156">{t.ctaTitle}</h2>
							<p className="jk-contact-157">{t.ctaBody}</p>
							<div className="jk-contact-158">
								<button
									className="jk-contact-159"
									onClick={openModal}
									type="button"
								>
									{t.ctaPrimary}
								</button>
								<a
									className="jk-contact-160"
									href={sitePath(toolUrl)}
									target={"_blank"}
									rel="noopener noreferrer"
								>
									{t.heroCta2}
									{" ↗"}
								</a>
							</div>
						</div>
					</section>
				</main>
				<footer className="jk-footer-161">
					<div className="jk-footer-162">
						<div>
							<div className="jk-hero-56">
								<span className="jk-footer-163">
									<img
										className="jk-header-6"
										src={sitePath("/assets/logo.png")}
										alt={"见客 JianKe 品牌标识"}
									/>
								</span>
								<span className="jk-footer-164">{"见客"}</span>
							</div>
							<p className="jk-footer-165">{t.footTag}</p>
						</div>
						{footerCols.map((col) => (
							<Fragment key={col.title}>
								<div>
									<div className="jk-footer-166">{col.title}</div>
									<div className="jk-footer-167">
										{col.links.map((l) => (
											<Fragment key={l.label}>
												<a
													className="jk-footer-168"
													href={sitePath(l.href)}
													target={l.target}
												>
													{l.label}
												</a>
											</Fragment>
										))}
									</div>
								</div>
							</Fragment>
						))}
						<div>
							<div className="jk-footer-166">{t.footContact}</div>
							<div className="jk-footer-169">
								<span>{t.footPhone}</span>
								<span>{t.footMail}</span>
								<span>{t.footAddr}</span>
							</div>
						</div>
					</div>
					<div className="jk-footer-170">
						<span>{t.footCopy}</span>
						<span className="jk-footer-171">{t.footIcp}</span>
					</div>
				</footer>
				{modalOpen && (
					// biome-ignore lint/a11y/useKeyWithClickEvents: The backdrop is pointer-only; Escape and the close button provide keyboard dismissal.
					<div className="jk-home-172" onClick={onOverlayClick}>
						{/* biome-ignore lint/a11y/useKeyWithClickEvents: Only stops pointer events from reaching the backdrop; keyboard controls are handled by usePageState. */}
						<dialog
							open
							className="jk-home-173"
							onClick={stop}
							aria-modal={"true"}
							aria-label={t.formTitle}
							tabIndex={-1}
						>
							{submitted && (
								<div className="jk-home-174">
									<div className="jk-home-175">{"✓"}</div>
									<div className="jk-home-176">{t.formDoneTitle}</div>
									<p className="jk-home-177">{t.formDoneBody}</p>
									<button
										className="jk-home-178"
										onClick={closeModal}
										type="button"
									>
										{t.formClose}
									</button>
								</div>
							)}
							{notSubmitted && (
								<div>
									<div className="jk-home-179">
										<div>
											<div className="jk-service-tiers-114">{t.formTitle}</div>
											<p className="jk-home-180">{t.formSub}</p>
										</div>
										<button
											className="jk-home-181"
											onClick={closeModal}
											aria-label={"close"}
											type="button"
										>
											{"×"}
										</button>
									</div>
									<form className="jk-form-182" onSubmit={onSubmit}>
										{formFields.map((f) => (
											<Fragment key={f.name}>
												<label
													className="jk-form-183"
													style={{ gridColumn: f.span }}
												>
													<span className="jk-form-184">{f.label}</span>
													<input
														className="jk-form-185"
														name={f.name}
														required={f.required}
														placeholder={f.ph}
														type={f.name === "phone" ? "tel" : "text"}
														autoComplete={
															f.name === "name"
																? "name"
																: f.name === "phone"
																	? "tel"
																	: f.name === "company"
																		? "organization"
																		: "off"
														}
													/>
												</label>
											</Fragment>
										))}
										<div className="jk-form-186">
											<span className="jk-form-184">{t.formNeed}</span>
											<textarea
												className="jk-form-187"
												name={"need"}
												rows={"3"}
												placeholder={t.formNeedPh}
												aria-label={t.formNeed}
											/>
										</div>
										<button className="jk-form-188" type={"submit"}>
											{t.formSubmit}
										</button>
										<p className="jk-form-189">{t.formPrivacy}</p>
									</form>
								</div>
							)}
						</dialog>
					</div>
				)}
			</div>
		</>
	);
}
