/** A lens entry in the primary rail: a named route, its label, and the
 * single-key hint the keyboard grammar assigns it (A.06 §9: digits switch
 * lenses). The hint is both displayed (`kbd`) and wired (`useLensShortcuts`). */
export interface LensEntry {
  readonly to:
    | "home"
    | "components"
    | "definitions"
    | "standards"
    | "journeys"
    | "guides";
  readonly label: string;
  readonly hint: "1" | "2" | "3" | "4" | "5" | "6";
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
 */
export const LENS_ENTRIES: readonly LensEntry[] = [
  { to: "home", label: "Home", hint: "1" },
  { to: "components", label: "Components", hint: "2" },
  { to: "definitions", label: "Definitions", hint: "3" },
  { to: "standards", label: "Standards", hint: "4" },
  { to: "journeys", label: "Journeys", hint: "5" },
  { to: "guides", label: "Guides", hint: "6" },
] as const;
