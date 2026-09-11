import type { ReactNode, Ref } from "react";
import type { DataTableStatus } from "../../types.js";

/**
 * Props of the table's status row.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the table's status, not forwarding a caller's
 * native props.
 */
export type StatusRowProps = {
  readonly status: DataTableStatus;
  readonly renderStatus: (status: DataTableStatus) => ReactNode;
  /** The row's logical position, reported only by a windowed table. */
  readonly position?: number;
  /** The row element, for a windowed table to measure. */
  readonly ref?: Ref<HTMLDivElement>;
};
