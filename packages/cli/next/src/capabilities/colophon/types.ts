/**
 * Data shapes for `pragma colophon`.
 *
 * A colophon (the printer's end-note on how a book is made) for the toolchain:
 * one section narrating how pragma itself is built, followed by one section per
 * active pack/domain that declares a `colophon`. Storeless and read-only.
 */

/** One colophon section — pragma's own, or an active pack's domain story. */
export interface ColophonSection {
  /** Whether this is pragma's built-in section or an active pack's. */
  readonly kind: "pragma" | "pack";
  /** Section heading — `"pragma"`, or the pack's noun/name. */
  readonly title: string;
  /**
   * The authored Markdown BODY (no leading H1 — the renderer supplies the
   * heading from {@link title}, so a section is never double-titled).
   */
  readonly markdown: string;
  /** Optional condensed body for `--format llm` (pragma supplies one). */
  readonly summary?: string;
  /** Provenance: `"built-in"`, or `"pack:<name>"`. */
  readonly source?: string;
}

/** The full `colophon` payload: pragma's section first, then active packs'. */
export interface ColophonData {
  readonly sections: readonly ColophonSection[];
}
