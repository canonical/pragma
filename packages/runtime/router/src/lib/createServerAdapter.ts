import type { PlatformAdapter } from "./types.js";

function buildUrl(input: string | URL): URL {
  if (input instanceof URL) {
    return new URL(input.href);
  }

  if (input.startsWith("http://") || input.startsWith("https://")) {
    return new URL(input);
  }

  return new URL(input, "https://router.local");
}

/** Create a static server-side adapter for a single request URL. */
export default function createServerAdapter(
  initialUrl: string | URL,
): PlatformAdapter {
  const location = buildUrl(initialUrl);

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
