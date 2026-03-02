import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "hot-reload",
      handleHotUpdate(ctx) {
        const isPackageJson = ctx.file.endsWith("package.json");
        if (!isPackageJson) {
          return;
        }

        const install = spawnSync("npm", ["install"], {
          cwd: ctx.server.config.root,
          stdio: "inherit",
          shell: process.platform === "win32",
        });

        if (install.status !== 0) {
          console.warn("npm install failed after package.json change; running full reload only.");
        }

        ctx.server.ws.send({ type: "full-reload" });
        return [];
      },
    },
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});