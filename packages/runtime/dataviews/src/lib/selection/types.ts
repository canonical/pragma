/**
 * The collection's selection: explicit record identities with a revision,
 * and the handle that edits them.
 */

import type { ReadonlyChannel } from "../observable/index.js";
/**
 * Immutable selection snapshot: an explicit set of record identities.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SelectionState = {
  /** The selected record identities; empty is a valid, documented state.
   * The set is shared by reference between publishes; treat it as
   * read-only, like every snapshot value this package hands out. */
  readonly ids: ReadonlySet<string>;
  /** Bumped on every accepted membership mutation; the selection's version. */
  readonly revision: number;
};

/**
 * Handle of one selection record.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type Selection = {
  /** The selection's snapshots; immutable between publications. */
  readonly state: ReadonlyChannel<SelectionState>;
  /** Toggle one identity. */
  readonly toggle: (id: string) => void;
  /** Replace the selection with the given identities. */
  readonly set: (ids: readonly string[]) => void;
  /** Add identities to the current selection. */
  readonly add: (ids: readonly string[]) => void;
  /** Remove identities from the current selection. */
  readonly remove: (ids: readonly string[]) => void;
  /** Clear the selection to the documented zero-selection state. */
  readonly clear: () => void;
};
