import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const port = Number(process.env.PORT || 22838);
const base = process.env.BASE_PATH || "/";

function runtimeConfigPlugin(): Plugin {
  return {
    name: "reportready-runtime-config",
    configureServer(server) {
      server.middlewares.use("/runtime-config.js", (_req, res) => {
        const config = {
          buyMeCoffeeUrl:
            process.env.VITE_BUY_ME_COFFEE_URL ||
            "https://example.com/reportready-buy-me-a-coffee-placeholder",
          analyticsAdminPath: process.env.ANALYTICS_ADMIN_PATH || "/garden-room-9274",
        };
        res.setHeader("Content-Type", "text/javascript; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(`window.__REPORTREADY_CONFIG__ = ${JSON.stringify(config)};\n`);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), runtimeConfigPlugin()],
  base,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${process.env.API_PORT || 3001}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist/public",
    emptyOutDir: true,
  },
});
