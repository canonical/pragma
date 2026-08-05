/**
 * The shortcut allocation: every route's claimed key, and the two lookups
 * anything reading it needs.
 *
 * THIS IS THE HOLE THE OLD DESIGN LEFT OPEN. Before this, the digits lived
 * in `LENS_ENTRIES` as a `"1" | … | "6"` union. A union rejects an INVALID
 * key; nothing rejected a DUPLICATE one — two entries claiming `"3"`
 * compiled cleanly, the listener resolved it by array order (`.find()`,
 * first wins) and the rail rendered the digit twice. Collecting the
 * allocation is what makes a collision a failure instead of a coin toss.
 */

import type { AnyRoute } from "@canonical/router-core";
import { collectFacet } from "#lib/routeFacet/index.js";
import { routeShortcutFacet } from "./shortcutFacet.js";

export interface ShortcutAllocation<TName extends string = string> {
  /** key → route name: what a keystroke resolves against. */
  readonly byKey: ReadonlyMap<string, TName>;
  /** route name → key: what a display reads. */
  readonly byRoute: ReadonlyMap<TName, string>;
}

/**
 * Collect `routes`' shortcut allocation, enforcing both invariants.
 *
 * BOTH INVARIANTS THROW, matching the conviction the strip facet already
 * established: a half-declared annotation is a bug, not an absence. The
 * cost — a bad allocation crashes the shell rather than degrading — is
 * bounded, because the allocation is STATIC ROUTE DATA pinned by a test
 * (`collectShortcuts.tests.ts` asserts the app's real table), so an
 * unpinned bad allocation cannot reach production. The alternative (return
 * the duplicates, let a test complain, first-wins at runtime) puts the
 * guarantee entirely in a test someone can delete.
 *
 * 1. NO DOUBLE ALLOCATION — the defect described above.
 * 2. NO SHORTCUT ON A PARAMETERISED ROUTE. `navigate(name)` for a route
 *    taking params would need params the keystroke does not have, and
 *    `/components/:uri`, `/definitions/:term`, `/standards/:uri`,
 *    `/journeys/:job` and `/guides/:slug` are all one keystroke away from
 *    being mis-annotated. It is also what lets `useLensShortcuts` collapse
 *    `NavigateFn`'s overload intersection soundly — the property is now
 *    ENFORCED rather than assumed.
 */
export const collectShortcuts = <
  TRoutes extends Readonly<Record<string, AnyRoute>>,
>(
  routes: TRoutes,
): ShortcutAllocation<Extract<keyof TRoutes, string>> => {
  const byKey = new Map<string, Extract<keyof TRoutes, string>>();
  const byRoute = new Map<Extract<keyof TRoutes, string>, string>();

  for (const { name, route, value } of collectFacet(
    routeShortcutFacet,
    routes,
  )) {
    if (route.url.includes(":")) {
      throw new Error(
        `route "${name}" takes params (${route.url}) and cannot carry a bare shortcut`,
      );
    }
    const claimed = byKey.get(value);
    if (claimed !== undefined) {
      throw new Error(
        `shortcut "${value}" is claimed by both "${claimed}" and "${name}"`,
      );
    }
    byKey.set(value, name);
    byRoute.set(name, value);
  }

  return { byKey, byRoute };
};
