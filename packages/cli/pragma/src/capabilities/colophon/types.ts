/**
 * Data shapes for `pragma colophon`.
 *
 * A colophon (the printer's end-note on how a book is made) for the toolchain:
 * one section narrating how the distribution itself is built — declared in its
 * config, not authored in code — followed by one section per active pack/domain
 * that declares a `colophon`. Storeless and read-only.
 */

/** One colophon section — the distribution's own, or an active pack's story. */
export interface ColophonSection {
  /**
   * Whether this is the distribution's declared section or an active pack's.
   * `"pragma"` is a FROZEN JSON-visible discriminant (wire compatibility, like
   * the `pragma:` resource scheme) — it does not track the distribution's
   * name; a fork's own section still carries `kind: "pragma"`.
   */
  readonly kind: "pragma" | "pack";
  /** Section heading — the distribution's name, or the pack's noun/name. */
  readonly title: string;
  /**
   * The authored Markdown BODY (no leading H1 — the renderer supplies the
   * heading from {@link title}, so a section is never double-titled).
   */
  readonly markdown: string;
  /** Optional condensed body for `--format llm` (the declaration's `summary`). */
  readonly summary?: string;
  /** Provenance: `"built-in"`, or `"pack:<name>"`. */
  readonly source?: string;
}

/**
 * The full `colophon` payload: the distribution's declared section first (when
 * its config declares one), then active packs'.
 */
export interface ColophonData {
  readonly sections: readonly ColophonSection[];
}
