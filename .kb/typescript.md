# Preface

Which TypeScript each package here builds with, and the TypeScript 7 behaviours that affect this repository's packages and their consumers. Read this before changing a TypeScript or Svelte packaging version, a `tsconfig`, or how a package imports its stylesheets.

Read the top-level `.kb/agents.md` file before continuing below.

# Overview

The repository builds with TypeScript 7, except the four Svelte packages under `packages/svelte/` (`ds-app`, `ds-app-launchpad`, `ds-app-wpe` and `ds-global`).

# Important

- **The Svelte packages stay on `typescript ~6.0.3`**, with `@sveltejs/package` pinned at exactly `3.0.0-next.8` and `outDir` at the top level of `svelte.config.js`. They move to TypeScript 7 once the Svelte tooling supports it.
- **No Renovate rule holds that pin.** Renovate may merge a new `3.0.0-next.N` or a TypeScript 6 minor into those packages on its own; check that the Svelte packages still build and package when it does.
- **A package declares its stylesheet side-effect imports through `src/vite-env.d.ts`**, with `/// <reference types="vite/client" />`. Do not add a `css.d.ts`.
- **TypeScript 7 drops the JSDoc of a `const X = () => …` component that has properties attached to it.** The loss is accepted for now; a `function` declaration keeps its JSDoc.
- **Published `.d.ts` files keep their `import "./x.css"` lines**, so a consumer on TypeScript 7 who does not set `skipLibCheck` sees errors from them.
