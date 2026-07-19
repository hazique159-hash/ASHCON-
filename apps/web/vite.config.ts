import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");

// Workspace UI package is consumed as source (no build step), so alias it directly
// and let Vite compile its TSX. fs.allow is widened to the monorepo root.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@ca/ui/styles.css",
        replacement: path.resolve(repoRoot, "packages/ui/src/styles/globals.css"),
      },
      { find: /^@ca\/ui$/, replacement: path.resolve(repoRoot, "packages/ui/src/index.ts") },
      {
        find: /^@ca\/contracts$/,
        replacement: path.resolve(repoRoot, "packages/contracts/src/index.ts"),
      },
    ],
  },
  optimizeDeps: { exclude: ["@ca/ui", "@ca/contracts"] },
  server: {
    port: 5173,
    host: true,
    fs: { allow: [repoRoot] },
    // Proxy the API so the browser sees same-origin requests: the httpOnly
    // refresh cookie stays first-party and no CORS preflight is involved.
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
});
