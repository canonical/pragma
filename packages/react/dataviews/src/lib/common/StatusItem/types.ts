import type { DisplayStatus } from "@canonical/dataviews-core";
import type { ReactNode } from "react";

/**
 * Props of a renderer's status.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the core's status, not forwarding a caller's native
 * props.
 */
export type StatusItemProps = {
  /** The status, as the core decided it. */
  readonly status: DisplayStatus;
  /** The text or content shown for it. */
  readonly renderStatus: (status: DisplayStatus) => ReactNode;
};
