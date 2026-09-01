/**
 * The package root is loaded by NODE, when Storybook evaluates a project's
 * `.storybook/main.ts`. Keep it free of anything that touches browser globals.
 *
 * `previewConfig` is deliberately NOT re-exported here. It pulls in the docs
 * container and, through it, `@storybook/addon-docs/blocks`, which touches
 * `document` at module scope — re-exporting it from this entry makes every
 * `main.ts` in the repo fail to evaluate with "document is not defined".
 * Import it from `@canonical/storybook-config/preview`, which is loaded in the
 * preview iframe where those globals exist.
 */

export { default as createConfig } from "./createConfig.js";
