import { defineConfig } from "vite";
import { litCss } from "./vite-plugin-lit-css.js";

export default defineConfig({
  plugins: [
    litCss({
      verbose: false,
      exclude: /\.storybook\/.*\.css$/,
    }),
  ],
  publicDir: "public",
  server: {
    open: "/public/example.html",
  },
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["lit"],
    },
  },
});
