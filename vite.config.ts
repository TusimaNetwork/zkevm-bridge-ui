import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import svgr from "vite-plugin-svgr";

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  build: {
    sourcemap: true,
  },
  define: {
    bridgeVersion: JSON.stringify(process.env.npm_package_version),
  },
  plugins: [
    react({
      fastRefresh: false,
    }),
    svgr(),
  ],
  resolve: {
    alias: [{ find: "src", replacement: path.resolve(__dirname, "src") }],
  },
  server: {
    open: true,
    proxy: {
      '/api': {
        target: 'https://bridge.galacticdev000.tusima.network',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
      '/explore_api': {
        target: 'https://explore.eagle.tusima.network',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/explore_api/, '/api'),
      }
    },
  },
});
