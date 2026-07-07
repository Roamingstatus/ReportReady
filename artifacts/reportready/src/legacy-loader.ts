import { BREAKROOM_NAV_IMAGE, BREAKROOM_NAV_LABEL } from "@/lib/breakroom-nav";
import { MARQUEE_BULB_POSITIONS } from "@/lib/breakroom-marquee-bulbs";
import { attachLegacyAnalytics } from "@/lib/analytics-legacy-hooks";
import { startLegacyPageViewTracking } from "@/lib/analytics";
import { watchSheetEditButtons } from "@/lib/legacy-sheet-edit";

const LEGACY_CSS = "/legacy/index-KlhzHNou.css";
const LEGACY_JS = "/legacy/index-2vWQHVBw.js";

function loadStylesheet(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve();
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load ${href}`));
    document.head.appendChild(link);
  });
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function createMarqueeBulbs(): HTMLSpanElement {
  const bulbs = document.createElement("span");
  bulbs.className = "breakroom-marquee__bulbs";
  bulbs.setAttribute("aria-hidden", "true");

  for (const position of MARQUEE_BULB_POSITIONS) {
    const bulb = document.createElement("span");
    bulb.className = "bulb";
    bulb.style.top = `${position.top}%`;
    bulb.style.left = `${position.left}%`;
    bulbs.appendChild(bulb);
  }

  return bulbs;
}

function createBreakroomNavLink(): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = "/breakroom";
  link.className = "breakroom-nav-link";
  link.dataset.testid = "nav-breakroom";
  link.setAttribute("aria-label", BREAKROOM_NAV_LABEL);

  const marquee = document.createElement("span");
  marquee.className = "breakroom-marquee breakroom-nav-sign";

  const inner = document.createElement("span");
  inner.className = "breakroom-marquee__inner";

  const signClip = document.createElement("span");
  signClip.className = "breakroom-marquee__sign-clip";

  const img = document.createElement("img");
  img.src = BREAKROOM_NAV_IMAGE;
  img.alt = "";
  img.width = 1024;
  img.height = 456;
  img.decoding = "async";
  img.draggable = false;
  img.className = "breakroom-marquee__sign";

  signClip.appendChild(img);
  inner.appendChild(signClip);
  inner.appendChild(createMarqueeBulbs());
  marquee.appendChild(inner);
  link.appendChild(marquee);

  return link;
}

function getLegacyNavs(): NodeListOf<HTMLElement> {
  return document.querySelectorAll("header nav");
}

function fixLegacyNavLayout(nav: HTMLElement): void {
  nav.classList.remove("overflow-x-auto", "overflow-x-scroll");
  nav.classList.add("flex-wrap", "overflow-visible");
}

function syncBreakroomNavLinks(): void {
  const navs = getLegacyNavs();
  const isBreakroom = window.location.pathname.startsWith("/breakroom");

  for (const nav of navs) {
    fixLegacyNavLayout(nav);

    let link = nav.querySelector<HTMLElement>('[data-testid="nav-breakroom"]');
    if (!link) {
      link = createBreakroomNavLink();
      nav.appendChild(link);
    }

    link.classList.toggle("breakroom-nav-link--active", isBreakroom);
  }
}

function allLegacyNavsHaveBreakroomLink(): boolean {
  const navs = getLegacyNavs();
  if (navs.length === 0) return false;
  return [...navs].every((nav) => nav.querySelector('[data-testid="nav-breakroom"]'));
}

function waitForLegacyNav(maxAttempts = 240): void {
  let attempts = 0;
  const tick = () => {
    syncBreakroomNavLinks();
    if (allLegacyNavsHaveBreakroomLink()) {
      return;
    }
    attempts += 1;
    if (attempts < maxAttempts) {
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}

function watchLegacyNav(): void {
  let syncScheduled = false;

  const scheduleSync = () => {
    if (syncScheduled) return;
    syncScheduled = true;
    requestAnimationFrame(() => {
      syncScheduled = false;
      syncBreakroomNavLinks();
    });
  };

  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("popstate", scheduleSync);

  const patchHistory = (method: "pushState" | "replaceState") => {
    const original = history[method].bind(history);
    history[method] = (...args: Parameters<History["pushState"]>) => {
      original(...args);
      scheduleSync();
    };
  };

  patchHistory("pushState");
  patchHistory("replaceState");
}

export async function loadLegacyApp(): Promise<void> {
  await loadStylesheet(LEGACY_CSS);
  await loadStylesheet("/breakroom-nav.css");
  await loadStylesheet("/sheet-edit.css");
  await loadScript(LEGACY_JS);
  watchLegacyNav();
  waitForLegacyNav();
  watchSheetEditButtons();
  attachLegacyAnalytics();
  startLegacyPageViewTracking();
}
