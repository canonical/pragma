/**
 * The application surface of the core, spelled name by name.
 *
 * Every public name is listed here explicitly and nothing is re-exported
 * domain by domain: a domain barrel is the route sibling domains take to
 * one another and may carry names that never leave the package, so a name
 * joins this list only by its own line. Framework bindings take the shared
 * machinery from `./bindings`, and an application that keeps saved views
 * or mounts a virtualized table imports the bytes from `./indexeddb` and
 * `./virtualization`.
 */

export type {
  ActionFailure,
  ActionOutcome,
  ActionRequest,
  ActionRun,
} from "./action/index.js";
export type {
  Collection,
  CollectionConfig,
  RecordTypes,
} from "./collection/index.js";
export { createCollection } from "./collection/index.js";
export type {
  DataViewsState,
  ResultState,
  ResultStatus,
} from "./coordinator/index.js";
export type {
  FilterFeedback,
  FilterHandle,
  FilterHandles,
  FilterInputState,
} from "./filter/index.js";
export type {
  MemoryLocationConfig,
  PlatformLocation,
  QueryLocation,
} from "./location/index.js";
export {
  createMemoryLocation,
  createPlatformLocation,
} from "./location/index.js";
export type { ReadonlyChannel } from "./observable/index.js";
export type {
  DataViewsProvider,
  DataViewsProviderConfig,
} from "./provider/index.js";
export { createDataViewsProvider } from "./provider/index.js";
export type {
  GroupPath,
  GroupTerm,
  Predicate,
  PredicateOperand,
  PredicateOperator,
  Query,
  ResultWindow,
  Slice,
  SortDirection,
  SortTerm,
  WindowNavigation,
} from "./query/index.js";
export { DEFAULT_WINDOW, EMPTY_SLICE } from "./query/index.js";
export type {
  Completion,
  Count,
  GroupSummary,
  PageCursors,
  ResultProblem,
  ResultProvenance,
  SourceCounts,
  SourceDelivery,
  SourceFailure,
  SourcePage,
  SourceRefusal,
  SourceRefusalCode,
  SourceRefusalPart,
} from "./result/index.js";
export type {
  RowEntry,
  RowIdentifier,
  RowModel,
  RowRecord,
} from "./rows/index.js";
export type {
  AppliedOf,
  ChoicesField,
  DateField,
  EmptyOr,
  FieldKind,
  FieldValidation,
  FlagField,
  NumberField,
  Schema,
  SchemaFieldDefinition,
  SchemaPredicateResult,
  TextField,
} from "./schema/index.js";
export { createSchema } from "./schema/index.js";
export type { Selection, SelectionState } from "./selection/index.js";
export type {
  ActionCapabilities,
  ActionTargets,
  ArraySource,
  ArraySourceConfig,
  CapabilityDeclaration,
  CountCapabilities,
  CountSupport,
  GroupCapabilities,
  PageConfig,
  PaginationCapabilities,
  QuerySourceConfig,
  RelaySourceConfig,
  SliceReading,
  SortCapabilities,
  SortTiebreak,
  Source,
  SourceActionRequest,
  SourceActionRunner,
  SourceCapabilities,
  SourceRequest,
} from "./source/index.js";
export {
  createArraySource,
  createPage,
  createQuerySource,
  createRelaySource,
  declareCapabilities,
  readSlice,
} from "./source/index.js";
export type {
  JsonValue,
  PreferenceResult,
  PresentationPatch,
  PresentationTarget,
  ProviderViews,
  SavedView,
  UnreadableView,
  ViewAction,
  ViewChanges,
  ViewCreateResult,
  ViewDraft,
  ViewGetResult,
  ViewList,
  ViewOperation,
  ViewOutcome,
  ViewPresentation,
  ViewRemoveResult,
  ViewRevision,
  ViewSettledOutcome,
  ViewStore,
  ViewsState,
  ViewUpdateResult,
} from "./views/index.js";
export type {
  DecodedQuery,
  DecodeQueryConfig,
  EncodeQueryConfig,
  QueryIssue,
} from "./wire/index.js";
export { decodeQuery, encodeQuery } from "./wire/index.js";
