import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @typedef {import("@sveltejs/vite-plugin-svelte").SvelteConfig} SvelteConfig */
/** @typedef {import("@sveltejs/package").Options} SveltePackageOptions */
/** @type {SvelteConfig & SveltePackageOptions} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    outDir: ".build-cache",
  },
};
