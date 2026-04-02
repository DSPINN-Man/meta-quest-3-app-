import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  root: ".",
  publicDir: "public",
  plugins: [basicSsl()],
  build: {
    outDir: "dist",
    target: "es2020",
  },
  server: {
    port: 3000,
    host: true,
    https: {},
  },
  preview: {
    port: 3000,
    host: true,
    https: {},
  },
});
