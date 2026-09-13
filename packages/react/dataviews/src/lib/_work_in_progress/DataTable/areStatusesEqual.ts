import type { DataTableStatus } from "./types.js";

/** A status's reason, where its status has one. */
const readReason = (status: DataTableStatus): string | undefined =>
  "reason" in status ? status.reason : undefined;

/** Two statuses say the same thing: the same status, for the same reason. */
export default function areStatusesEqual(
  a: DataTableStatus | null,
  b: DataTableStatus | null,
): boolean {
  return (
    a === b ||
    (a !== null &&
      b !== null &&
      a.status === b.status &&
      readReason(a) === readReason(b))
  );
}
