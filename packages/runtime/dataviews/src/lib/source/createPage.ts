import type { Count, SourcePage } from "../result/index.js";
import type { RowRecord } from "../rows/index.js";
import type { PageConfig } from "./types.js";

/** A count given is exact; one left out is unknown. */
const readCount = (value: number | undefined): Count =>
  value === undefined ? { kind: "unknown" } : { kind: "exact", value };

/**
 * Build the envelope one request answers with. A count given is exact and
 * a count omitted is unknown, and the pageable count is the matched count,
 * because nothing this source can be asked collapses rows out of a page.
 * `more` and `cursors` are absent unless given: an offset source has
 * neither, and a cursor source hands back what its backend did.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function createPage<TRow extends object = RowRecord>(
  config: PageConfig<TRow>,
): SourcePage<TRow> {
  const matched = readCount(config.matched);
  return Object.freeze({
    rows: config.rows,
    groups: null,
    counts: Object.freeze({
      pageable: matched,
      matched,
      total: readCount(config.total),
    }),
    more: config.more ?? null,
    cursors: config.cursors ?? null,
  });
}
