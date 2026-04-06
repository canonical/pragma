import type { ReactNode } from "react";

/** Props accepted by `Outlet`. */
export interface OutletProps {
  /** Content shown while suspended route output is pending. */
  readonly fallback?: ReactNode;
}
