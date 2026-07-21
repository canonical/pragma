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
 */
export const LENS_ENTRIES: readonly LensEntry[] = [
  { to: "home", label: "Home", hint: "1" },
  { to: "components", label: "Components", hint: "2" },
  { to: "definitions", label: "Definitions", hint: "3" },
  { to: "standards", label: "Standards", hint: "4" },
  { to: "journeys", label: "Journeys", hint: "5" },
  { to: "guides", label: "Guides", hint: "6" },
] as const;
