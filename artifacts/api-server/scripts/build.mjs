import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

await esbuild.build({
  entryPoints: [path.join(root, "src/index.ts")],
  outfile: path.join(root, "dist/index.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  packages: "external",
  sourcemap: false,
  minify: false,
});

console.log("[api-server] Built dist/index.mjs");
