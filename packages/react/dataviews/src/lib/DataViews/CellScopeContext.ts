import type { Identity, ReadonlyChannel } from "@canonical/dataviews-core";
import { createContext } from "react";

/**
 * The value installed per rendered cell by the table renderer: the owning
 * provider, stable row and column identifiers, and the cell's observable
 * channels. The channels are read-only: a cell scope is a projection, not
 * another place to publish from.
 *
 * The provider is held as what its one consumer uses it for — a witness
 * compared by reference. Typing it as the whole provider would fix a field
 * list the table cannot know, and every table would cast its own provider
 * to satisfy it.
 */
export type CellScopeValue = {
  readonly provider: { readonly identity: Identity };
  readonly rowId: string;
  readonly columnId: string;
  readonly row: ReadonlyChannel<unknown>;
  readonly fields: Readonly<Record<string, ReadonlyChannel<unknown>>>;
  readonly selected: ReadonlyChannel<boolean>;
};

/**
 * React context carrying the current cell scope, installed by the table
 * renderer per cell. `useDataViewsCell()` reads from it.
 */
const CellScopeContext = createContext<CellScopeValue | null>(null);

export default CellScopeContext;
