import { type DataTableWindowing, windowed } from "../DataTable/index.js";
import { VirtualBody } from "./common/index.js";
import type { VirtualRowsConfig } from "./types.js";

/**
 * Mount only the rows near a DataTable's viewport, however many rows its
 * result window holds.
 *
 * ```tsx
 * const windowing = virtualRows({ estimatedRowHeight: 24 });
 *
 * <DataTable provider={provider} columns={columns} label="Machines" windowing={windowing} />;
 * ```
 *
 * The result is an immutable descriptor, not a running virtualizer: every
 * table given it keeps its own viewport, measurements and focus, so one
 * descriptor serves any number of tables.
 */
export default function virtualRows({
  estimatedRowHeight,
}: VirtualRowsConfig): DataTableWindowing {
  if (!Number.isFinite(estimatedRowHeight) || estimatedRowHeight <= 0) {
    throw new Error(
      "virtualRows requires a positive estimatedRowHeight, in pixels",
    );
  }
  return Object.freeze({
    [windowed]: Object.freeze({ body: VirtualBody, estimatedRowHeight }),
  });
}
