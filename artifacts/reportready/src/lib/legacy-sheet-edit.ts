import {
  beginSheetEdit,
  getTemplateIdFromPrintButtonTestId,
  isFreeEditableSheetId,
} from "@/lib/sheet-edit";

const EDIT_BUTTON_CLASS = "sheet-edit-button";
const TOOLBAR_CLASS = "sheet-view-toolbar";

function createEditButton(templateId: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = EDIT_BUTTON_CLASS;
  button.dataset.testid = `button-edit-${templateId}`;
  button.setAttribute("aria-label", `Edit sheet in builder`);
  button.textContent = "Edit in Builder";

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    beginSheetEdit(templateId);
  });

  return button;
}

function injectEditButtonBesidePrint(printButton: Element): void {
  const testId = printButton.getAttribute("data-testid");
  if (!testId) return;

  const templateId = getTemplateIdFromPrintButtonTestId(testId);
  if (!templateId || !isFreeEditableSheetId(templateId)) return;

  const toolbar = printButton.parentElement;
  if (!(toolbar instanceof HTMLElement)) return;

  if (toolbar.querySelector(`[data-testid="button-edit-${templateId}"]`)) {
    return;
  }

  toolbar.classList.add(TOOLBAR_CLASS);
  const editButton = createEditButton(templateId);
  toolbar.insertBefore(editButton, printButton);
}

export function syncSheetEditButtons(): void {
  const printButtons = document.querySelectorAll('[data-testid^="button-print-"]');
  for (const printButton of printButtons) {
    injectEditButtonBesidePrint(printButton);
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
