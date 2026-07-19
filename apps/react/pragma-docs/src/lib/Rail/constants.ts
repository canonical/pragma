/** A lens entry in the primary rail: a named route, its label, and the
 * single-key hint the keyboard grammar assigns it (A.06 §9: digits switch
 * lenses). The hint is both displayed (`kbd`) and wired (`useLensShortcuts`). */
export interface LensEntry {
  readonly to: "home" | "components" | "definitions" | "standards" | "guides";
  readonly label: string;
  readonly hint: "1" | "2" | "3" | "4" | "5";
}

/**
 * The v1 lens set, in the owner-ruled order (P-4.1 brief): Home ·
 * Components · Definitions · Standards · Guides. Tokens/Audit arrive as
 * later entries without re-layout — the rail scales vertically (AX.2).
 */
export const LENS_ENTRIES: readonly LensEntry[] = [
  { to: "home", label: "Home", hint: "1" },
  { to: "components", label: "Components", hint: "2" },
  { to: "definitions", label: "Definitions", hint: "3" },
  { to: "standards", label: "Standards", hint: "4" },
  { to: "guides", label: "Guides", hint: "5" },
] as const;
