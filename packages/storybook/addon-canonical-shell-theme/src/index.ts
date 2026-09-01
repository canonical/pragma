/**
 * @canonical/storybook-addon-shell-theme
 *
 * Applies Canonical branding to Storybook's CHROME — the manager frame
 * (sidebar, toolbar) and, via `@canonical/storybook-config`, the documentation
 * page. It does not theme story content; that is
 * `@canonical/storybook-addon-utils`. See the README for the boundary.
 *
 * `THEME` is exported so consumers can theme surfaces this addon cannot reach
 * from the manager. The documentation page is one such surface: it renders in
 * the preview iframe, a separate document, so the manager theme never arrives
 * there and it must be passed in explicitly.
 *
 * Import from the built output, not from source — the theme inlines its logos
 * with Vite-only `?inline` imports.
 */

export { THEME } from "./theme/index.js";
