/**
 * The machinery every framework binding shares and no application calls:
 * the column geometry a table solves, the row scopes and display entries a
 * body renders from, the identity tokens a binding checks a provider by,
 * the channels it hands values through, and the slice comparison a bar
 * settles pages with. React uses it now; a Svelte binding would use the
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
  columnTemplate,
  createColumnLayout,
  createGridInteraction,
  resolveColumns,
  sizingEquals,
} from "../geometry/index.js";
export { createIdentity, isIdentity } from "../identity/index.js";
export type { Channel, ChannelConfig } from "../observable/index.js";
export { createChannel } from "../observable/index.js";
export { canonicalSlice, sliceEquals } from "../query/index.js";
export type {
  DisplayEntriesConfig,
  DisplayEntry,
  DisplayEntryKind,
  RowScope,
  RowScopes,
  RowScopesConfig,
} from "../rows/index.js";
export { createRowScopes, displayEntries } from "../rows/index.js";
