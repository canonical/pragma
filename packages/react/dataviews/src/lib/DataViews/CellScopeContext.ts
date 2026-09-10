import type {
  Channel,
  DataViewsProvider,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import { createContext } from "react";

/**
 * The value installed per rendered cell by the table renderer: the owning
 * provider (as an identity witness), stable row and column identifiers,
 * and the cell's observable channels.
 */
export type CellScopeValue = {
  readonly provider: DataViewsProvider<readonly SchemaFieldDefinition[]>;
  readonly rowId: string;
  readonly columnId: string;
  readonly row: Channel<unknown>;
  readonly fields: Readonly<Record<string, Channel<unknown>>>;
  readonly selected: Channel<boolean>;
};

/**
 * React context carrying the current cell scope, installed by the table
 * renderer per cell. `useDataViewsCell()` reads from it.
 */
const CellScopeContext = createContext<CellScopeValue | null>(null);

export default CellScopeContext;
