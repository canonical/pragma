# Canonical Vitest Configuration (React)

This package provides a reusable configuration factory for the Vitest `test`
block of Canonical's React packages. It replaces the near-identical `test`
blocks that were previously copy-pasted into every package's `vite.config.ts`.

Every React vitest posture in the monorepo — jsdom component tests, the
client/SSR project split, coverage-gated packages, and node-only packages — is
a point in one option space, so this is a single factory rather than a set of
per-shape variants.

## Getting started

1. Add the package as a dev dependency: `bun add -d @canonical/vitest-config-react`.
2. In your `vite.config.ts`, import the factory and spread its result into
   `test`:

```typescript
import react from "@vitejs/plugin-react";
import { reactTestConfig } from "@canonical/vitest-config-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  build: { sourcemap: true },
  test: reactTestConfig({
    glob: "tests",
    setupFiles: ["./vitest.setup.ts"],
  }),
});
```

The factory owns only the `test` block. `plugins`, `resolve` and `build` stay
in each package's config, because those legitimately differ (for example, some
packages run in `jsdom` while framework-agnostic/SSR packages run in `node`).

## Options

| Option        | Type                              | Default   | Notes                                                                                          |
| ------------- | --------------------------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `glob`        | `"test" \| "tests"`, or an array of those | — | **Required.** The test-file suffix convention(s). See the caveat below.                        |
| `environment` | `"jsdom" \| "node"`               | `"jsdom"` | `"node"` for framework-agnostic / SSR-only packages.                                           |
| `ssr`         | `boolean`                         | `false`   | Adds a second `node` project running `**/*.ssr.<glob>.tsx` (the client project excludes them). |
| `coverage`    | `boolean \| { … }`                | `false`   | `true` enables v8 coverage with 100% thresholds; pass an object to override.                   |
| `setupFiles`  | `string[]`                        | `[]`      | e.g. `["./vitest.setup.ts"]`; omitted when empty.                                              |
| `plugins`     | `Plugin[]`                        | —         | Attached to each project (Vitest resolves plugins per project).                                |

### Coverage

Coverage is **off by default**, preserving the behaviour of packages that do
not gate coverage today. When enabled, thresholds default to
`100/100/100/100`, following the storybook-config convention of "sensible
defaults you pass through":

```typescript
// 100% thresholds
reactTestConfig({ glob: "test", coverage: true });

// keep 100% for everything except lines
reactTestConfig({ glob: "test", coverage: { thresholds: { lines: 80 } } });

// runtime-only include (SSR adapters)
reactTestConfig({ glob: "tests", environment: "node", coverage: { include: ["src/lib/**/*.ts"] } });
```

## Caveat: `glob` is load-bearing

`glob` has no default because `.test.` and `.tests.` are **not**
interchangeable: choosing the wrong convention silently matches zero files — a
green run that ran nothing. Always pass the convention(s) the package's test
files actually use.

### Interim: running both conventions

A package whose test files are split between `.test.` and `.tests.` (for
example `react-ds-global`, whose `_work_in_progress` scaffolds use `.test.`
while the promoted components use `.tests.`) can pass both:

```typescript
reactTestConfig({ glob: ["test", "tests"], ssr: true });
```

Both conventions are then matched by the client project and, with `ssr: true`,
by the SSR project (`**/*.ssr.test.tsx` and `**/*.ssr.tests.tsx`); coverage
excludes test files of both conventions. This is an **interim** escape hatch:
once the repo-wide test-file naming unification lands, packages should return
to a single convention and the array form should disappear.

## Roadmap: browser mode

`jsdom` is the interim environment. The forward path is Vitest browser mode
with Playwright (see the `svelte-ds-global` migration). This factory will gain
a `browser` option so each package can flip to browser mode without rewriting
its config — only its test files.
