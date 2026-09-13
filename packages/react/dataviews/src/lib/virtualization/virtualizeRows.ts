import { type DataTableVirtualization, VIRTUALIZED } from "../common/index.js";
import { VirtualBody } from "./common/index.js";
import type { VirtualRowsConfig } from "./types.js";

/**
 * Mount only the rows near a DataTable's viewport, however many rows its
 * result window holds.
 *
 * ```tsx
 * const virtualization = virtualizeRows({ estimatedRowHeight: 24 });
 *
 * <DataTable provider={provider} columns={columns} label="Machines" virtualization={virtualization} />;
 * ```
 *
 * The result is an immutable descriptor, not a running virtualizer: every
 * table given it keeps its own viewport, measurements and focus, so one
 * descriptor serves any number of tables.
 *
 * `import { virtualizeRows } from "@canonical/dataviews-react/virtualization";`
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function virtualizeRows({
  estimatedRowHeight,
}: VirtualRowsConfig): DataTableVirtualization {
  if (!Number.isFinite(estimatedRowHeight) || estimatedRowHeight <= 0) {
    throw new Error(
      "virtualizeRows requires a positive estimatedRowHeight, in pixels",
    );
  }
  return Object.freeze({
    [VIRTUALIZED]: Object.freeze({ body: VirtualBody, estimatedRowHeight }),
  });
}
