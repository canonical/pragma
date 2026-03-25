// Must be imported first so that hydration support is installed
// before any Lit components are registered or upgraded.
import "@lit-labs/ssr-client/lit-element-hydrate-support.js";

// Register all components
import "@canonical/lit-ds-prototype";

import { render } from "lit";
import { appTemplate } from "../app.js";
import "../index.css";

const root = document.getElementById("root");
// Declarative shadow DOM <template shadowrootmode> is consumed by the browser
// parser before JS runs, so we can't query for it. Instead, check whether the
// server already injected child elements into #root.
const hasSSRContent = (root?.childElementCount ?? 0) > 0;
if (root && !hasSSRContent) {
  render(appTemplate, root);
}
