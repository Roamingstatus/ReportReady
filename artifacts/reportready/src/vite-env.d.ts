/// <reference types="vite/client" />

interface ReportReadyConfig {
  buyMeCoffeeUrl?: string;
  analyticsAdminPath?: string;
}

interface Window {
  __REPORTREADY_CONFIG__?: ReportReadyConfig;
}
