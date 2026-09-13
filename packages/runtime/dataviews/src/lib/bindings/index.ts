/**
 * The machinery every framework binding shares and no application calls:
 * the column geometry a table solves, the row channels a body renders
 * from, the table's status, the entries of its body and the pagination facts
 * a bar offers — each projected from the published state — the filter
 * records a root builds, the check a binding tells a provider by, the
 * provider's internal host, the list comparison, and the wire key a form
 * control is named by. React uses it now; a Svelte binding would use the
 * same names rather than solve its own geometry.
 */

export type {
  DisplayEntriesConfig,
  DisplayEntry,
  DisplayEntryKind,
  DisplayPagination,
} from "../display/index.js";
export {
  areDisplayStatusesEqual,
  DISPLAY_STATUS_PHASES,
  listDisplayEntries,
  resolveDisplayStatus,
  resolvePagination,
} from "../display/index.js";
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
export { areListsEqual } from "../query/index.js";
export type {
  Applicability,
  RowChannels,
  RowScopes,
  RowScopesConfig,
} from "../rows/index.js";
export { createRowScopes } from "../rows/index.js";
export { spellWireKey } from "../wire/index.js";
