import buildUrl from "./buildUrl.js";
import type { PlatformAdapter } from "./types.js";

/** Create a static server-side adapter for a single request URL. */
export default function createServerAdapter(
  initialUrl: string | URL,
): PlatformAdapter {
  const location = new URL(buildUrl(initialUrl).href);

  return {
    getLocation() {
      return new URL(location.href);
    },
    navigate() {
      throw new Error(
        "Server adapter does not support client-side navigation.",
      );
    },
    subscribe() {
      return () => {};
    },
  };
}
