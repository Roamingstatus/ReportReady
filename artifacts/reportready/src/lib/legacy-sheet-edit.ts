import { beginSheetEdit } from "@/lib/sheet-edit";

const EDIT_BUTTON_CLASS = "sheet-edit-button";

function extractTemplateIdFromPrintButton(button: Element): string | null {
  const testId = button.getAttribute("data-testid");
  const match = testId?.match(/^button-view-print-(.+)$/);
  return match?.[1] ?? null;
}

function createEditButton(templateId: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = EDIT_BUTTON_CLASS;
  button.dataset.testid = `button-edit-${templateId}`;
  button.setAttribute("aria-label", `Edit ${templateId} in builder`);
  button.textContent = "Edit";

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    beginSheetEdit(templateId);
  });

  return button;
}

function prepareFooterLayout(footer: HTMLElement): void {
  footer.classList.add("sheet-edit-footer");
  if (footer.classList.contains("grid-cols-1")) {
    footer.classList.remove("grid-cols-1");
    footer.classList.add("grid-cols-2");
  }
}

function injectEditButtonForPrintButton(printButton: Element): void {
  const templateId = extractTemplateIdFromPrintButton(printButton);
  if (!templateId) return;

  const footer = printButton.closest("footer, [class*='CardFooter']") ?? printButton.parentElement;
  if (!(footer instanceof HTMLElement)) return;

  if (footer.querySelector(`[data-testid="button-edit-${templateId}"]`)) {
    return;
  }

  prepareFooterLayout(footer);
  const editButton = createEditButton(templateId);
  footer.insertBefore(editButton, printButton);
}

export function syncSheetEditButtons(): void {
  const printButtons = document.querySelectorAll('[data-testid^="button-view-print-"]');
  for (const printButton of printButtons) {
    injectEditButtonForPrintButton(printButton);
  }
}

export function watchSheetEditButtons(): void {
  let syncScheduled = false;

  const scheduleSync = () => {
    if (syncScheduled) return;
    syncScheduled = true;
    requestAnimationFrame(() => {
      syncScheduled = false;
      syncSheetEditButtons();
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

  scheduleSync();
}
