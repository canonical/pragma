import {
  type SvelteConfig,
  vitePreprocess,
} from "@sveltejs/vite-plugin-svelte";

const config: SvelteConfig = {
  // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
  // for more information about preprocessors
  preprocess: vitePreprocess(),
};

export default config;
