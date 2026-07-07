import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AnalyticsAdminApp } from "@/AnalyticsAdminApp";
import { BreakroomApp } from "@/BreakroomApp";
import { loadLegacyApp } from "@/legacy-loader";
import { isAnalyticsAdminPath } from "@/lib/runtime-config";

const pathname = window.location.pathname;
const isBreakroom = pathname === "/breakroom" || pathname.startsWith("/breakroom/");
const isAnalyticsAdmin = isAnalyticsAdminPath(pathname);

async function boot() {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Missing #root element");
  }

  if (isAnalyticsAdmin) {
    await import("@/index.css");
    createRoot(root).render(
      <StrictMode>
        <AnalyticsAdminApp />
      </StrictMode>,
    );
    return;
  }

  if (isBreakroom) {
    await import("@/index.css");
    createRoot(root).render(
      <StrictMode>
        <BreakroomApp />
      </StrictMode>,
    );
    return;
  }

  await loadLegacyApp();
}

boot().catch((error) => {
  console.error("ReportReady bootstrap failed:", error);
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML =
      '<p style="font-family:system-ui;padding:2rem;color:#b91c1c">Failed to load ReportReady. Please refresh.</p>';
  }
});
