/**
 * Base URL used to resolve relative paths when no real origin is available.
 *
 * Parsing a bare pathname like "/users/42" through `new URL(...)` requires an
 * origin. This sentinel provides one without depending on `window.location`.
 * The host name never appears in any public output — it is stripped immediately
 * after the URL is constructed.
 */
export const ROUTER_LOCAL_BASE = "https://router.local";
