/**
 * A lens entry in the primary rail: a named route and its label.
 *
 * NO DIGIT. The single-key hint (A.06 §9: digits switch lenses) used to
 * live here as a `"1" | … | "6"` union; it is now allocated by the ROUTE
 * THAT OWNS THE DESTINATION (`#lib/routeShortcut`) and collected off the
 * route table. This table keeps the ORDER and the LABEL, and nothing else.
 *
 * The move closed a real hole: a union rejects an INVALID digit but is
 * silent about a DUPLICATE one, so two entries claiming `"3"` compiled,
 * resolved first-wins at runtime and rendered twice. A duplicate is now a
 * test failure (`collectShortcuts.tests.ts`), not a coin toss.
 */
export interface LensEntry {
  readonly to:
    | "home"
    | "components"
    | "definitions"
    | "standards"
    | "journeys"
    | "guides";
  readonly label: string;
}

/**
 * The v1 lens set, in the owner-ruled order (P-4.1 brief): Home ·
 * Components · Definitions · Standards · Journeys · Guides. Tokens/Audit
 * arrive as later entries without re-layout — the rail scales vertically
 * (AX.2).
 *
 * Journeys (AV-351) sits after Standards and before Guides: it is a lens
 * over the demand model rather than over the design system's own nouns, so
 * it reads as the last of the reference lenses, with Guides — the prose —
 * still last overall.
 *
 * Journeys is an ADD-ON, and it STAYS LISTED. It was reclassified out of the
 * core lens set — its code lives in `#addons/journeys`, not
 * `#domains/lenses`, because it reads pragma's own ontology and cannot be
 * expressed on the provider-neutral contract (see `src/addons/journeys/
 * index.ts`). The owner's ruling was "keep it on side", not "hide it": it is
 * a real, working, shipped view of this deployment's graph, so hiding it
 * would mean removing a working page from readers to make a classification
 * legible, which serves nobody. A deployment that does NOT have pragma's
 * demand model will drop the add-on and its rail entry together — which is
 * what the eventual plugin mechanism is for, and is why this entry is the
 * one place the rail knows about it.
 *
 * THE ORDER STAYS DECLARED HERE, and must not be derived from the
 * collector. `appRoutes`' key order happens to filter down to exactly this
 * sequence today, which makes deriving it tempting and wrong: it would
 * couple the rail's visual order to a destructuring order in `routes.tsx`,
 * and it inverts the rule — the owner ruled the ORDER, and the digits
 * follow from it, not the reverse.
 */
export const LENS_ENTRIES: readonly LensEntry[] = [
  { to: "home", label: "Home" },
  { to: "components", label: "Components" },
  { to: "definitions", label: "Definitions" },
  { to: "standards", label: "Standards" },
  { to: "journeys", label: "Journeys" },
  { to: "guides", label: "Guides" },
] as const;
