(() => {
  "use strict";

  // Chinese is the source HTML; English only replaces translated text/attributes.
  const english = window.JK_EN;
  const bindings = [];
  for (const attribute of [
    null,
    "placeholder",
    "aria-label",
    "title",
    "alt",
    "content",
  ]) {
    const marker = attribute ? `data-i18n-${attribute}` : "data-i18n";
    document.querySelectorAll(`[${marker}]`).forEach((element) => {
      bindings.push({
        element,
        attribute,
        key: element.getAttribute(marker),
        chinese: attribute
          ? element.getAttribute(attribute)
          : element.textContent,
      });
    });
  }
  let language = "zh";
  function setLanguage(next) {
    language = next === "en" ? "en" : "zh";
    for (const binding of bindings) {
      const value = language === "en" ? english[binding.key] : binding.chinese;
      if (binding.attribute)
        binding.element.setAttribute(binding.attribute, value);
      else binding.element.textContent = value;
    }
    document.documentElement.lang = language === "en" ? "en" : "zh-CN";
    document.querySelectorAll("[data-language]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.language === language),
      );
    });
  }
  try {
    setLanguage(localStorage.getItem("jk_lang"));
  } catch {
    setLanguage("zh");
  }
  window.addEventListener("storage", (event) => {
    if (event.key === "jk_lang" || event.key === null)
      setLanguage(event.newValue);
  });

  const menu = document.getElementById("mobile-menu");
  const menuButton = document.querySelector('[data-action="menu"]');
  const modal = document.getElementById("consultation");
  let surface = null;
  let returnFocus = null;
  let previousOverflow = "";

  function focusable() {
    return Array.from(
      surface.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
      ),
    ).filter((element) => element.getClientRects().length);
  }

  function closeSurface(restoreFocus = true) {
    if (!surface) return;
    surface.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
    document.body.style.overflow = previousOverflow;
    surface = null;
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus();
  }

  function openSurface(next, trigger) {
    const opener = trigger.closest("#mobile-menu") ? menuButton : trigger;
    closeSurface(false);
    returnFocus = opener;
    previousOverflow = document.body.style.overflow;
    surface = next;
    surface.hidden = false;
    document.body.style.overflow = "hidden";
    menuButton.setAttribute("aria-expanded", String(surface === menu));
    focusable()[0]?.focus();
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (button) {
      switch (button.dataset.action) {
        case "language":
          setLanguage(
            button.dataset.language || (language === "zh" ? "en" : "zh"),
          );
          try {
            localStorage.setItem("jk_lang", language);
          } catch {}
          break;
        case "menu":
          if (surface === menu) closeSurface();
          else openSurface(menu, button);
          break;
        case "open-modal":
          openSurface(modal, button);
          break;
        case "close-modal":
          closeSurface();
          break;
      }
    }
    if (event.target.closest("#mobile-menu a")) closeSurface();
    if (modal && event.target === modal) closeSurface();
    document.querySelectorAll(".nav-directory[open]").forEach((directory) => {
      if (!directory.contains(event.target) || event.target.closest("a"))
        directory.open = false;
    });
    const category = event.target.closest("[data-category-filter]");
    if (category) {
      const selected = category.dataset.categoryFilter;
      document.querySelectorAll("[data-category-filter]").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === category));
      });
      document.querySelectorAll("[data-category]").forEach((post) => {
        post.hidden = selected !== "0" && post.dataset.category !== selected;
      });
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.querySelectorAll(".nav-directory[open]").forEach((directory) => {
        directory.open = false;
        directory.querySelector("summary").focus();
      });
    }
    if (!surface) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeSurface();
    } else if (event.key === "Tab") {
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (!first) {
        event.preventDefault();
      } else if (!surface.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  // All case text is in the HTML; tabs progressively enhance the three panels.
  const caseTabs = Array.from(document.querySelectorAll("[data-case-tab]"));
  function selectCase(tab, moveFocus = false) {
    caseTabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute("aria-controls")).hidden =
        !selected;
    });
    if (moveFocus) tab.focus();
  }
  caseTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectCase(tab));
    tab.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = (index + 1) % caseTabs.length;
      if (event.key === "ArrowLeft")
        next = (index + caseTabs.length - 1) % caseTabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = caseTabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        selectCase(caseTabs[next], true);
      }
    });
  });
  if (caseTabs[0]) selectCase(caseTabs[0]);

  window.matchMedia("(min-width: 1120px)").addEventListener("change", () => {
    if (surface === menu) closeSurface();
  });
  const sections = document.querySelectorAll("main section[id]");
  if (sections.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (!visible[0]) return;
        document.querySelectorAll('header nav a[href^="#"]').forEach((link) => {
          if (link.hash === `#${visible[0].target.id}`)
            link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.2, 0.6, 1] },
    );
    sections.forEach((section) => observer.observe(section));
  }
})();
