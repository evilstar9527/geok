"use client";

import { useCallback, useEffect, useState } from "react";

/** Shared language preference, responsive navigation and keyboard behavior. */
export function usePageState(initialState, observeSections = false) {
	const [state, updateState] = useState(initialState);
	const setState = useCallback((patch) => {
		updateState((current) => ({
			...current,
			...(typeof patch === "function" ? patch(current) : patch),
		}));
	}, []);

	useEffect(() => {
		let lang = "zh";
		try {
			if (localStorage.getItem("jk_lang") === "en") lang = "en";
		} catch {}
		const media = window.matchMedia("(min-width: 1120px)");
		setState({ lang, wide: media.matches });
		const syncWidth = () => setState({ wide: media.matches, menuOpen: false });
		const syncLanguage = (event) => {
			if (event.key === "jk_lang")
				setState({ lang: event.newValue === "en" ? "en" : "zh" });
		};
		const onKey = (event) => {
			if (event.key === "Escape")
				setState({ menuOpen: false, modalOpen: false });
		};
		media.addEventListener("change", syncWidth);
		window.addEventListener("storage", syncLanguage);
		document.addEventListener("keydown", onKey);
		return () => {
			media.removeEventListener("change", syncWidth);
			window.removeEventListener("storage", syncLanguage);
			document.removeEventListener("keydown", onKey);
		};
	}, [setState]);

	useEffect(() => {
		document.documentElement.lang = state.lang === "en" ? "en" : "zh-CN";
	}, [state.lang]);

	useEffect(() => {
		if (!observeSections) return;
		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((entry) => entry.isIntersecting)
					.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
				if (visible[0]) setState({ active: visible[0].target.id });
			},
			{ rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.2, 0.6, 1] },
		);
		for (const section of document.querySelectorAll("main section[id]")) {
			observer.observe(section);
		}
		return () => observer.disconnect();
	}, [observeSections, setState]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: Submission replaces the dialog controls, so refresh the focus trap.
	useEffect(() => {
		if (!state.modalOpen && !state.menuOpen) return;
		const previousOverflow = document.body.style.overflow;
		const previousFocus = document.activeElement;
		document.body.style.overflow = "hidden";
		const surface = state.modalOpen
			? document.querySelector("dialog[open]")
			: document.getElementById("mobile-menu");
		const focusable = () =>
			Array.from(
				surface?.querySelectorAll(
					'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
				) || [],
			);
		focusable()[0]?.focus();
		const trapFocus = (event) => {
			if (event.key !== "Tab") return;
			const elements = focusable();
			const first = elements[0];
			const last = elements.at(-1);
			if (!first) {
				event.preventDefault();
				return;
			}
			if (!surface.contains(document.activeElement)) {
				event.preventDefault();
				first.focus();
			} else if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};
		document.addEventListener("keydown", trapFocus);
		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener("keydown", trapFocus);
			if (previousFocus?.isConnected) previousFocus.focus();
		};
	}, [state.modalOpen, state.menuOpen, state.submitted]);

	return [state, setState];
}
