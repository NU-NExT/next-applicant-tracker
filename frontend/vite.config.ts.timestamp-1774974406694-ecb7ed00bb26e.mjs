// vite.config.ts
import { defineConfig } from "file:///app/node_modules/vite/dist/node/index.js";
import react from "file:///app/node_modules/@vitejs/plugin-react/dist/index.js";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "file:///app/node_modules/@tailwindcss/vite/dist/index.mjs";
var __vite_injected_original_import_meta_url = "file:///app/vite.config.ts";
var __dirname = dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var vite_config_default = defineConfig({
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
          shell: process.platform === "win32"
        });
        if (install.status !== 0) {
          console.warn("npm install failed after package.json change; running full reload only.");
        }
        ctx.server.ws.send({ type: "full-reload" });
        return [];
      }
    }
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src")
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvYXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvYXBwL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9hcHAvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0XCI7XHJcbmltcG9ydCB7IHNwYXduU3luYyB9IGZyb20gXCJub2RlOmNoaWxkX3Byb2Nlc3NcIjtcclxuaW1wb3J0IHsgZGlybmFtZSwgcmVzb2x2ZSB9IGZyb20gXCJub2RlOnBhdGhcIjtcclxuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gXCJub2RlOnVybFwiO1xyXG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSBcIkB0YWlsd2luZGNzcy92aXRlXCI7XHJcblxyXG5jb25zdCBfX2Rpcm5hbWUgPSBkaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSk7XHJcblxyXG4vLyBodHRwczovL3ZpdGUuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgdGFpbHdpbmRjc3MoKSxcclxuICAgIHtcclxuICAgICAgbmFtZTogXCJob3QtcmVsb2FkXCIsXHJcbiAgICAgIGhhbmRsZUhvdFVwZGF0ZShjdHgpIHtcclxuICAgICAgICBjb25zdCBpc1BhY2thZ2VKc29uID0gY3R4LmZpbGUuZW5kc1dpdGgoXCJwYWNrYWdlLmpzb25cIik7XHJcbiAgICAgICAgaWYgKCFpc1BhY2thZ2VKc29uKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBpbnN0YWxsID0gc3Bhd25TeW5jKFwibnBtXCIsIFtcImluc3RhbGxcIl0sIHtcclxuICAgICAgICAgIGN3ZDogY3R4LnNlcnZlci5jb25maWcucm9vdCxcclxuICAgICAgICAgIHN0ZGlvOiBcImluaGVyaXRcIixcclxuICAgICAgICAgIHNoZWxsOiBwcm9jZXNzLnBsYXRmb3JtID09PSBcIndpbjMyXCIsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGlmIChpbnN0YWxsLnN0YXR1cyAhPT0gMCkge1xyXG4gICAgICAgICAgY29uc29sZS53YXJuKFwibnBtIGluc3RhbGwgZmFpbGVkIGFmdGVyIHBhY2thZ2UuanNvbiBjaGFuZ2U7IHJ1bm5pbmcgZnVsbCByZWxvYWQgb25seS5cIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjdHguc2VydmVyLndzLnNlbmQoeyB0eXBlOiBcImZ1bGwtcmVsb2FkXCIgfSk7XHJcbiAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICBdLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgIFwiQFwiOiByZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgIH0sXHJcbiAgfSxcclxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUE4TCxTQUFTLG9CQUFvQjtBQUMzTixPQUFPLFdBQVc7QUFDbEIsU0FBUyxpQkFBaUI7QUFDMUIsU0FBUyxTQUFTLGVBQWU7QUFDakMsU0FBUyxxQkFBcUI7QUFDOUIsT0FBTyxpQkFBaUI7QUFMd0YsSUFBTSwyQ0FBMkM7QUFPakssSUFBTSxZQUFZLFFBQVEsY0FBYyx3Q0FBZSxDQUFDO0FBR3hELElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaO0FBQUEsTUFDRSxNQUFNO0FBQUEsTUFDTixnQkFBZ0IsS0FBSztBQUNuQixjQUFNLGdCQUFnQixJQUFJLEtBQUssU0FBUyxjQUFjO0FBQ3RELFlBQUksQ0FBQyxlQUFlO0FBQ2xCO0FBQUEsUUFDRjtBQUVBLGNBQU0sVUFBVSxVQUFVLE9BQU8sQ0FBQyxTQUFTLEdBQUc7QUFBQSxVQUM1QyxLQUFLLElBQUksT0FBTyxPQUFPO0FBQUEsVUFDdkIsT0FBTztBQUFBLFVBQ1AsT0FBTyxRQUFRLGFBQWE7QUFBQSxRQUM5QixDQUFDO0FBRUQsWUFBSSxRQUFRLFdBQVcsR0FBRztBQUN4QixrQkFBUSxLQUFLLHlFQUF5RTtBQUFBLFFBQ3hGO0FBRUEsWUFBSSxPQUFPLEdBQUcsS0FBSyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQzFDLGVBQU8sQ0FBQztBQUFBLE1BQ1Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxRQUFRLFdBQVcsT0FBTztBQUFBLElBQ2pDO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
