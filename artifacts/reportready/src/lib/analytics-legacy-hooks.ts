import { trackEvent } from "@/lib/analytics";

function extractTemplateId(testId: string): string | undefined {
  const match = testId.match(
    /(?:card|button)-(?:home-sheet|template|report-sheet|view-print|preview-only|unlock|use|review|download|review-download)-(.+)$/,
  );
  if (match?.[1]) return match[1];

  const suffix = testId.split("-").pop();
  if (!suffix || suffix === testId) return undefined;
  return suffix;
}

function handleLegacyClick(event: Event): void {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const clickable = target.closest("[data-testid], a[href]");
  if (!clickable) return;

  const testId = clickable.getAttribute("data-testid") ?? "";
  const href = clickable instanceof HTMLAnchorElement ? clickable.href : "";

  if (testId === "link-buy-me-coffee") {
    trackEvent("buy_me_coffee_click");
    return;
  }

  if (testId === "link-credanta-learn-more") {
    trackEvent("credanta_promo_click");
    return;
  }

  if (testId === "button-feedback-floating") {
    trackEvent("feedback_open");
    return;
  }

  if (testId.startsWith("button-preview-only-")) {
    trackEvent("coming_soon_preview_click", {
      templateId: extractTemplateId(testId),
    });
    return;
  }

  if (testId.startsWith("button-view-print-")) {
    trackEvent("print_click", { templateId: extractTemplateId(testId) });
    return;
  }

  if (
    testId.startsWith("card-home-sheet-") ||
    testId.startsWith("card-template-") ||
    testId.startsWith("card-report-sheet-")
  ) {
    trackEvent("template_view", { templateId: extractTemplateId(testId) });
    return;
  }

  if (href.includes("nexusgarden.live")) {
    trackEvent("nexusgarden_link_click", { href });
  }
}

function patchFeedbackFetch(): void {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    try {
      const url =
        typeof args[0] === "string"
          ? args[0]
          : args[0] instanceof Request
            ? args[0].url
            : "";
      if (url.includes("/api/feedback") && response.ok) {
        trackEvent("feedback_submit");
      }
    } catch {
      // Ignore tracking errors.
    }
    return response;
  };
}

export function attachLegacyAnalytics(): () => void {
  document.addEventListener("click", handleLegacyClick, true);
  patchFeedbackFetch();
  return () => {
    document.removeEventListener("click", handleLegacyClick, true);
  };
}
