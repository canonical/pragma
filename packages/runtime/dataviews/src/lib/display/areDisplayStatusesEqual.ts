import type { DisplayStatus } from "./types.js";

/** A status's reason, where it carries one. */
const readReason = (status: DisplayStatus): string | undefined =>
  "reason" in status ? status.reason : undefined;

/**
 * Whether two statuses say the same thing: the same status, for the same
 * reason. A binding holds a status at one reference while this holds, so
 * the entries are listed again only when the status changes.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function areDisplayStatusesEqual(
  a: DisplayStatus | null,
  b: DisplayStatus | null,
): boolean {
  return (
    a === b ||
    (a !== null &&
      b !== null &&
      a.status === b.status &&
      readReason(a) === readReason(b))
  );
}
