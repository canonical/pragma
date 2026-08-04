/**
 * Data shapes for `pragma colophon`.
 *
 * A colophon (the printer's end-note on how a book is made) for the toolchain:
 * one section narrating how the DISTRIBUTION is built — declared by it, in
 * `pragma.conf.ts` — followed by one section per active pack/domain that
 * declares a `colophon`. Storeless and read-only.
 */

/** One colophon section — the distribution's own, or an active pack's story. */
export interface ColophonSection {
  /**
   * Whether this is the distribution's own section or an active pack's.
   *
   * RENAMED from `"pragma"` to `"distribution"`, and that is a WIRE break: this
   * discriminant is JSON-visible, so any client persisting the `colophon` tool's
   * payload sees it. Taken deliberately. `"pragma"` was this distribution's name
   * sitting in a field no content can reach — one of the six measured `--format
   * json` occurrences a fork inherited, and the only one the colophon
   * declaration could not fix. The programme's 0-deprecation-window policy
   * prices the rename at zero, so it lands with a CHANGELOG row and no shim.
   *
   * Note the asymmetry with the MCP resource scheme, which this same slice
   * documents as deliberately FROZEN: `kind` is content the distribution
   * authors about itself, while `pragma:{+uri}` is protocol identity a client
   * has already persisted as an ADDRESS. Renaming the first costs a re-read;
   * renaming the second made 653 advertised resources unreadable.
   */
  readonly kind: "distribution" | "pack";
  /** Section heading — the distribution's own name, or the pack's noun/name. */
  readonly title: string;
  /**
   * The authored Markdown BODY (no leading H1 — the renderer supplies the
   * heading from {@link title}, so a section is never double-titled).
   */
  readonly markdown: string;
  /**
   * Optional condensed body for `--format llm` — supplied by whoever authored
   * the section (the distribution, in its `colophon` declaration), never by the
   * kernel. Absent here means the llm form falls back to {@link markdown}.
   */
  readonly summary?: string;
  /** Provenance: `"built-in"`, or `"pack:<name>"`. */
  readonly source?: string;
}

/**
 * The full `colophon` payload: the distribution's own section first WHEN it
 * declares one — the field is optional and the collector omits the section
 * rather than emitting an empty heading — then each active pack's.
 */
export interface ColophonData {
  readonly sections: readonly ColophonSection[];
}
