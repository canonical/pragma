import { ROUTER_LOCAL_BASE } from "./constants.js";

/**
 * Normalise a string or URL to a URL object.
 *
 * Absolute URLs and URL instances pass through unchanged. Bare pathnames
 * (e.g. "/users/42") are resolved against `ROUTER_LOCAL_BASE` so they can
 * be parsed without requiring a real browser origin.
 *
 * The returned URL is **not** cloned — callers that need an independent copy
 * must wrap the result in `new URL(url.href)`.
 */
export default function buildUrl(input: string | URL): URL {
  if (input instanceof URL) {
    return input;
  }

  if (input.startsWith("http://") || input.startsWith("https://")) {
    return new URL(input);
  }

  return new URL(input, ROUTER_LOCAL_BASE);
}
