import { render } from "@lit-labs/ssr";
import { collectResult } from "@lit-labs/ssr/lib/render-result.js";

// Register components in the SSR custom elements registry provided by @lit-labs/ssr
import "@canonical/lit-ds-prototype";

import { hyperscalePage } from "pages/hyperscale.js";
// [multi-page] For a single page, only import that page's template and export
// a single renderApp() function.
import { serverPage } from "pages/server.js";

/**
 * Each function renders a page to an HTML string using Lit SSR.
 * Output includes Declarative Shadow DOM (<template shadowrootmode="open">)
 * which Lit's hydration support uses on the client to avoid full re-rendering.
 */
export async function renderServerPage(): Promise<string> {
  return collectResult(render(serverPage));
}

export async function renderHyperscalePage(): Promise<string> {
  return collectResult(render(hyperscalePage));
}
