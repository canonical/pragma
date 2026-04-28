import { render } from "@lit-labs/ssr";
import { collectResult } from "@lit-labs/ssr/lib/render-result.js";

// Register components in the SSR custom elements registry provided by @lit-labs/ssr
import "@canonical/lit-ds-prototype";

import { getTemplateForPath } from "routes.js";

/**
 * Renders the requested route to an HTML string using Lit SSR.
 * Output includes Declarative Shadow DOM (<template shadowrootmode="open">)
 * which Lit's hydration support uses on the client to avoid full re-rendering.
 */
export async function renderRoute(pathname: string): Promise<string> {
  const template = getTemplateForPath(pathname);
  return collectResult(render(template));
}
