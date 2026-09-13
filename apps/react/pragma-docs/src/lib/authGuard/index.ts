/**
 * The demo authentication guard, in one place for both callers: the route
 * middleware the client navigates through, and the HTTP entry points that have
 * to answer before a renderer exists.
 *
 * NOT barrelled from `#lib/index.js` — that barrel carries the app's
 * COMPONENTS, and nothing here renders. Import from `#lib/authGuard`.
 */

export { getAuthRedirectHref, withAuth } from "./authGuard.js";
