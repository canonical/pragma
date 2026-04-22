import createHistoryAdapter from "./createHistoryAdapter.js";
import createNavigationAdapter from "./createNavigationAdapter.js";
import type { PlatformAdapter } from "./types.js";

/**
 * Create a browser platform adapter using the best available API.
 *
 * Uses the Navigation API (`window.navigation`) when available, falling back
 * to the History API (`pushState` / `popstate`) for older browsers.
 */
export default function createBrowserAdapter(): PlatformAdapter {
  const win = globalThis as {
    window?: { navigation?: unknown; location?: { href: string } };
  };

  if (win.window && "navigation" in win.window && win.window.navigation) {
    return createNavigationAdapter();
  }

  return createHistoryAdapter();
}
