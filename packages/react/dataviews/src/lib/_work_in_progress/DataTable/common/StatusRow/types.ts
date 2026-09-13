import type { DisplayStatus } from "@canonical/dataviews-core";
import type { ReactNode, Ref } from "react";

/**
 * Props of the table's status row.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the table's status, not forwarding a caller's
 * native props.
 */
export type StatusRowProps = {
  readonly status: DisplayStatus;
  readonly renderStatus: (status: DisplayStatus) => ReactNode;
  /** The row's logical position, reported only by a virtualized table. */
  readonly position?: number | undefined;
  /** The row element, for a virtualized table to measure. */
  readonly ref?: Ref<HTMLDivElement> | undefined;
};
