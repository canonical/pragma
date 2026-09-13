import type { ColumnToSize, ResolvedColumn } from "./types.js";

/** The declarative track of one column, used before any width is measured. */
const declaredTrack = (column: ColumnToSize): string => {
  const { sizing } = column;
  if (sizing.kind === "fixed") {
    return `${sizing.px}px`;
  }
  if (sizing.maxPx !== undefined) {
    return `minmax(${sizing.minPx}px, ${sizing.maxPx}px)`;
  }
  return `minmax(${sizing.minPx}px, ${sizing.weight}fr)`;
};

/**
 * Build the shared `grid-template-columns` track list for one table: the one
 * geometry publication every row consumes, rather than a width written onto
 * every cell.
 *
 * With nothing measured the tracks are declarative, so the baseline is
 * aligned and readable before the solver can run and server output is
 * deterministic. Once the container is measured the caller passes the
 * solver's resolved vector — the one it already holds, so the solve is not
 * repeated here — which is what capping and resizing need. A live resize
 * preview is substituted into that vector by its holder, before the last
 * column is filled, so the authoritative layout is untouched until the
 * resize commits.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function buildColumnTemplate(
  columns: readonly ColumnToSize[],
  resolved: readonly ResolvedColumn[] | null,
): string {
  if (columns.length === 0) {
    return "none";
  }
  return resolved === null
    ? columns.map(declaredTrack).join(" ")
    : resolved.map((column) => `${column.width}px`).join(" ");
}
