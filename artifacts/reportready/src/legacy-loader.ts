import { BREAKROOM_NAV_IMAGE, BREAKROOM_NAV_LABEL } from "@/lib/breakroom-nav";
import { MARQUEE_BULB_POSITIONS } from "@/lib/breakroom-marquee-bulbs";
import { attachLegacyAnalytics } from "@/lib/analytics-legacy-hooks";
import { startLegacyPageViewTracking } from "@/lib/analytics";

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

function injectBreakroomNavLink(): void {
  const nav = document.querySelector("header nav");
  if (!nav || nav.querySelector('[data-testid="nav-breakroom"]')) {
    return;
  }

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

  if (window.location.pathname.startsWith("/breakroom")) {
    link.classList.add("breakroom-nav-link--active");
  }

  nav.appendChild(link);
}

function fixLegacyNavLayout(): void {
  const nav = document.querySelector("header nav");
  if (!nav) return;
  nav.classList.remove("overflow-x-auto", "overflow-x-scroll");
  nav.classList.add("flex-wrap");
}

function waitForLegacyNav(maxAttempts = 120): void {
  let attempts = 0;
  const tick = () => {
    injectBreakroomNavLink();
    fixLegacyNavLayout();
    if (document.querySelector('[data-testid="nav-breakroom"]')) {
      return;
    }
    attempts += 1;
    if (attempts < maxAttempts) {
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}

export async function loadLegacyApp(): Promise<void> {
  await loadStylesheet(LEGACY_CSS);
  await loadStylesheet("/breakroom-nav.css");
  await loadScript(LEGACY_JS);
  waitForLegacyNav();
  attachLegacyAnalytics();
  startLegacyPageViewTracking();
}
