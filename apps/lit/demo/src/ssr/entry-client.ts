// Must be imported before any Lit component imports.
// It installs hydration support on LitElement so that when components
// are registered below, they know to attach to existing server-rendered
// shadow DOM rather than re-render from scratch.
import "@lit-labs/ssr-client/lit-element-hydrate-support.js";

// Register all components
import "@canonical/lit-ds-prototype";

import { hydrate } from "@lit-labs/ssr-client";
import { render } from "lit";
import { hyperscalePage } from "../pages/hyperscale.js";
// [multi-page] For a single page, import only that page's template and pass
// it directly to render() below, removing the routes map entirely.
import { serverPage } from "../pages/server.js";
import "../index.css";

/**
 * Maps each pathname to its template.
 * This must mirror the routes defined in server.ts — if a route exists on the
 * server, it must have a matching entry here so the client hydrates the correct
 * template.
 *
 * [multi-page] For a single page, remove this map and pass the template
 * directly to render() below.
 */
const routes: Record<string, unknown> = {
  "/server": serverPage,
  "/server/hyperscale": hyperscalePage,
};

const root = document.getElementById("root")!;
const template = routes[window.location.pathname] ?? serverPage;

// If the root contains SSR content, hydrate to attach event listeners without
// re-rendering. Otherwise (e.g. during `vite dev`), fall back to a full
// client-side render.
const hasSSRContent =
  root.childNodes.length > 1 ||
  (root.childNodes.length === 1 &&
    root.childNodes[0].nodeType !== Node.COMMENT_NODE);

if (hasSSRContent) {
  hydrate(template, root);
} else {
  render(template, root);
}
