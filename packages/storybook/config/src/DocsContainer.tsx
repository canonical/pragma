import { THEME } from "@canonical/storybook-addon-shell-theme";
import {
  DocsContainer as BaseDocsContainer,
  type DocsContainerProps,
} from "@storybook/addon-docs/blocks";
import {
  type PropsWithChildren,
  type ReactElement,
  useSyncExternalStore,
} from "react";

/**
 * Documentation pages render in the preview iframe — a separate document from
 * the manager — so the chrome theme applied by
 * `@canonical/storybook-addon-shell-theme` never reaches them. Left alone they
 * fall back to Storybook's stock light theme, which is why every docs page
 * rendered as unbranded grey regardless of branding or OS setting
 * (canonical/pragma#962). This supplies the theme they are missing. The full
 * reasoning is in this package's README.
 *
 * Keep this component in this package. Moving it into the shell-theme addon,
 * where it looks like it belongs, would bundle a SECOND React into that addon —
 * its Vite build externalises `storybook/*` but nothing else — and this
 * component calls a hook, so the duplicate copy raises an invalid hook call.
 *
 * The failure is specifically React, not a lost docs context: addon-docs parks
 * its context on `globalThis.__DOCS_CONTEXT__` (first loader wins) precisely so
 * that duplicate bundles share one instance. React is the singleton that does
 * not survive duplication.
 *
 * Import `@storybook/addon-docs/blocks` statically, not behind `lazy()`. The
 * static import does hoist the docs-blocks graph into the eager preview bundle,
 * which is a real cost — but a `Suspense` boundary here wraps the ENTIRE docs
 * page, because `Docs` passes the page in as `children`. Storybook's
 * render-complete callback sits outside that boundary and fires from a layout
 * effect, so the first docs page would signal `DOCS_RENDERED` while committed
 * empty: Chromatic can snapshot a blank page, and the container's hash-scroll
 * effect finds no anchors. Trimming the eager bundle needs a different approach.
 *
 * Scope: chrome only. Story content theming belongs to
 * `@canonical/storybook-addon-utils`.
 */

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

const subscribe = (onStoreChange: () => void) => {
  const query = window.matchMedia(DARK_SCHEME_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
};

const getSnapshot = () => window.matchMedia(DARK_SCHEME_QUERY).matches;

/**
 * Themes the documentation page chrome, following the reader's OS light/dark
 * preference. Wired up by `previewConfig` as `parameters.docs.container`.
 *
 * A project that sets `parameters.docs.theme` explicitly still wins; this only
 * supplies the OS-following default the page would otherwise not have.
 */
export const DocsContainer = (
  props: PropsWithChildren<DocsContainerProps>,
): ReactElement => {
  const isDark = useSyncExternalStore(subscribe, getSnapshot);

  return (
    <BaseDocsContainer
      {...props}
      theme={props.theme ?? (isDark ? THEME.dark : THEME.light)}
    />
  );
};
