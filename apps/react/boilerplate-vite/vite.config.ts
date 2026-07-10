import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import relay from "vite-plugin-relay-lite";

// Path aliases (#lib, #domains, #styles) are declared as Node subpath imports
// in package.json "imports" and resolved natively by Vite — no resolver plugin.
const PORT = Number(process.env.PORT) || undefined;

// `build:server` runs `vite build --mode server` to compile the two server
// renderers in a single pass. Each is a separate, individually-instantiated
// Lego brick, so they are named Rollup inputs — the build emits
// `dist/server/renderer.js` (the JSX app) + `dist/server/sitemap.js` (the XML
// sitemap), which the preview servers import directly. Every other command
// (`dev`, `build:client`, `preview`) uses the default mode and the SPA client
// build (`--ssrManifest --outDir dist/client`).
export default defineConfig(({ mode }) => ({
  // Relay's `graphql\`...\`` tags must be rewritten into imports of the
  // compiler-generated artifacts. `@vitejs/plugin-react` v6 is OXC-based (no
  // Babel), so the classic `babel-plugin-relay` route would need the
  // `@rolldown/plugin-babel` escape hatch; `vite-plugin-relay-lite` does the
  // same rewrite with its own parser and no Babel, and works on Vite 8 /
  // rolldown despite its peer range stopping at Vite 7 (bun installs it with
  // only a peer-version warning). `codegen: false` because artifacts are
  // committed and regenerated explicitly via `bun run relay` / `relay:watch`.
  plugins: [relay({ codegen: false }), react()],
  // Honour the PORT env var for `dev` (SPA) and `preview` so all server scripts
  // — including the SSR ones, which already read PORT — respond to it uniformly.
  server: { port: PORT },
  preview: { port: PORT },
  build:
    mode === "server"
      ? {
          ssr: true,
          outDir: "dist/server",
          rollupOptions: {
            input: {
              renderer: "src/server/renderer.tsx",
              sitemap: "src/sitemap/renderer.ts",
            },
          },
        }
      : undefined,
  ssr: {
    // Bundle @canonical/* for SSR rather than externalising them, for two
    // reasons: (1) some packages declare only a "module" entry (no
    // "main"/"exports"), which Vite's SSR (Node-style) resolver ignores —
    // externalising them fails with ERR_RESOLVE_PACKAGE_ENTRY_FAIL; (2) their
    // built output imports CSS as a side effect (e.g. `import "./x.css"`),
    // which Node cannot load (ERR_UNKNOWN_FILE_EXTENSION) but Vite's SSR
    // transform no-ops. The regex covers the whole scope so any current or
    // future @canonical dependency is handled.
    //
    // The Relay packages (react-relay, relay-runtime, relay-runtime-network,
    // graphql) stay externalised like react itself. Two packaging defects
    // made that possible and are fixed via `patchedDependencies` (see
    // patches/ at the repo root): react-relay's CJS exports are member
    // expressions cjs-module-lexer cannot detect (breaking named imports
    // under Node SSR and Vite's dev module runner), and
    // relay-runtime-network@0.1.0 ships an `imports` map pointing at its
    // unpublished src/ directory.
    noExternal: [/^@canonical\//],
  },
}));
