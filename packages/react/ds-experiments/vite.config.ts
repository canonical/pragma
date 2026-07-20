import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import relay from "vite-plugin-relay-lite";

// https://vitejs.dev/config/
export default defineConfig({
  // Relay's `graphql\`...\`` tags must be rewritten into imports of the
  // compiler-generated artifacts before React can run them. `@vitejs/plugin-react`
  // v6 is OXC-based (no Babel), so the classic `babel-plugin-relay` route would
  // need the `@rolldown/plugin-babel` escape hatch; `vite-plugin-relay-lite` does
  // the same rewrite with its own parser and no Babel, and works on Vite 8 /
  // rolldown despite its peer range stopping at Vite 7 (bun installs it with only
  // a peer-version warning). `codegen: false` because artifacts are committed and
  // regenerated explicitly via `bun run relay` / `relay:watch`. Storybook's
  // react-vite framework merges this config, so the same rewrite applies there.
  plugins: [relay({ codegen: false }), react()],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    // include sourcemaps for easier debugging
    sourcemap: true,
  },
});
