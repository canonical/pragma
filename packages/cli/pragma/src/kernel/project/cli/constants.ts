/**
 * CLI projector constants — the flag/doc pairs that must read identically
 * wherever they surface.
 *
 * The mutation flags are auto-injected onto every mutating verb by
 * `registerParams` (and by the mounted create subtree's own registration),
 * and `formatVerbHelp` renders them in the Flags block; a default-true
 * boolean's `--no-` negation is likewise both registered and rendered. Help
 * and registration deriving from the SAME rows here is what keeps a page
 * from denying a flag that parses — the defect this file exists to prevent.
 */

/** One auto-injected flag: the token and the doc both surfaces print. */
export interface FlagDoc {
  readonly flag: string;
  readonly doc: string;
}

/** The three mutation flags every mutating verb accepts, in display order. */
export const MUTATION_FLAG_DOCS: readonly FlagDoc[] = [
  { flag: "--dry-run", doc: "Preview effects without applying them" },
  { flag: "--undo", doc: "Reverse a previous run of this command" },
  { flag: "--yes", doc: "Apply without an interactive confirmation" },
];

/**
 * The doc for the `--no-<flag>` negation a default-true boolean registers.
 *
 * @param kebab - The positive flag's kebab token (no dashes).
 * @returns The doc string registration and help share.
 */
export function negationFlagDoc(kebab: string): string {
  return `Disable --${kebab} (on by default).`;
}
