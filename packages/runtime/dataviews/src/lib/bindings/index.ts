/**
 * The machinery every framework binding shares and no application calls:
 * the column geometry a table solves, the row scopes and display entries a
 * body renders from, the identity check a binding tells a provider by, and
 * the list and slice comparisons a bar settles pages with. React uses it now; a Svelte binding would use the
 * same names rather than solve its own geometry.
 */

export type {
  ColumnLayout,
  ColumnLayoutState,
  ColumnSizing,
  ColumnToSize,
  FixedSizing,
  FlexSizing,
  GridInteraction,
  GridInteractionState,
  ResolvedColumn,
} from "../geometry/index.js";
export {
  areSizingsEqual,
  buildColumnTemplate,
  createColumnLayout,
  createGridInteraction,
  resolveColumns,
} from "../geometry/index.js";
export { isIdentity } from "../identity/index.js";
export { areListsEqual, areSlicesEqual } from "../query/index.js";
export type {
  DisplayEntriesConfig,
  DisplayEntry,
  DisplayEntryKind,
  RowScope,
  RowScopes,
  RowScopesConfig,
} from "../rows/index.js";
export { createRowScopes, listDisplayEntries } from "../rows/index.js";
