import type { IncomingMessage } from "node:http";
import { extractPreferences } from "@canonical/react-hooks";

/** The request-derived initial data the entrypoint renders from. */
export interface RequestInitialData extends Record<string, unknown> {
  readonly url: string;
  readonly theme?: "light" | "dark";
}

/** Read the `Cookie` header from either a Web `Request` or a Node request. */
function cookieHeader(request: Request | IncomingMessage): string | null {
  if (typeof (request as Request).headers?.get === "function") {
    return (request as Request).headers.get("cookie");
  }
  const header = (request as IncomingMessage).headers?.cookie;
  return header ?? null;
}

/**
 * Resolve the request's initial data — the URL and the cookie-backed theme
 * preference — for SSR. The theme flows into `initialData` so the server can
 * paint the correct colour scheme on first byte and `usePreferredTheme` can
 * hydrate from the same value without a flash. Accepts either request shape so
 * the dev servers (Web `Request`) and `serve-express` (Node `IncomingMessage`)
 * share one path.
 */
export function resolveInitialData(
  request: Request | IncomingMessage,
  url: string,
): RequestInitialData {
  const { theme } = extractPreferences(cookieHeader(request));
  return {
    url,
    theme: theme === "light" || theme === "dark" ? theme : undefined,
  };
}
