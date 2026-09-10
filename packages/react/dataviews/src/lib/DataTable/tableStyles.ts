import type { CSSProperties } from "react";

/**
 * The one row layout every row shares, in every table. Rows read the track
 * list from the container's custom property, so publishing new geometry is
 * one write on the container — never a width written onto a cell.
 */
export const rowStyle: Readonly<CSSProperties> = Object.freeze({
  display: "grid",
  gridTemplateColumns: "var(--data-table-columns)",
});

/** The status row's single cell spans every track. */
export const statusCellStyle: Readonly<CSSProperties> = Object.freeze({
  gridColumn: "1 / -1",
});
