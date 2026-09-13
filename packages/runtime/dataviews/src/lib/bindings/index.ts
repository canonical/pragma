/**
 * The machinery every framework binding shares and no application calls:
 * the column geometry a table solves, the row channels and display entries
 * a body renders from, the filter records a root builds, the check a
 * binding tells a provider by, the provider's internal host and
 * the list and slice comparisons a bar settles pages with. React uses it
 * now; a Svelte binding would use the same names rather than solve its own
 * geometry.
 */

export type {
  FilterInputs,
  FilterInputsConfig,
} from "../filter/index.js";
export { createFilterInputs } from "../filter/index.js";
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
export type { ProviderHost } from "../provider/index.js";
export { isDataViewsProvider, readProviderHost } from "../provider/index.js";
export { areListsEqual, areSlicesEqual } from "../query/index.js";
export type {
  Applicability,
  DisplayEntriesConfig,
  DisplayEntry,
  DisplayEntryKind,
  RowChannels,
  RowScopes,
  RowScopesConfig,
} from "../rows/index.js";
export { createRowScopes, listDisplayEntries } from "../rows/index.js";
