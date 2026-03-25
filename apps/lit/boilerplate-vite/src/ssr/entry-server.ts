import { render } from "@lit-labs/ssr";
import { collectResultSync } from "@lit-labs/ssr/lib/render-result.js";

// Register components in the SSR custom elements registry provided by @lit-labs/ssr
import "@canonical/lit-ds-prototype";

import { appTemplate } from "../app.js";

/**
 * Renders the application to an HTML string using Lit SSR.
 * Output includes declarative shadow DOM (<template shadowrootmode="open">)
 * which Lit's hydration support uses on the client to avoid full re-rendering.
 */
export function renderApp(): string {
  return collectResultSync(render(appTemplate));
}
