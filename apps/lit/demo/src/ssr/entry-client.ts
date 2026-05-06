// Must be imported before any Lit component imports.
// It installs hydration support on LitElement so that when components
// are registered below, they know to attach to existing server-rendered
// shadow DOM rather than re-render from scratch.
import "@lit-labs/ssr-client/lit-element-hydrate-support.js";

// Register all components
import "@canonical/lit-ds-prototype";

import { hydrate } from "@lit-labs/ssr-client";
import { render } from "lit";
import { getTemplateForPath } from "../routes.js";
import "../index.css";

const root = document.getElementById("root")!;
const template = getTemplateForPath(window.location.pathname);

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
