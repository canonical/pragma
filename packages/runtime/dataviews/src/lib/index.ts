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
  CollectionState,
  ResultState,
  ResultStatus,
} from "./collection/index.js";
export type {
  FieldFeedback,
  FieldInteractionState,
  FieldValidation,
} from "./field/index.js";
export type { Identity } from "./identity/index.js";
export type {
  Location,
  LocationBinding,
  LocationBindingConfig,
  LocationConfig,
  LocationHost,
  PlatformLocation,
} from "./location/index.js";
export {
  createLocationBinding,
  createMemoryLocation,
  createPlatformLocation,
} from "./location/index.js";
export type { ReadonlyChannel } from "./observable/index.js";
export type {
  ActionInvocation,
  Operation,
  OperationFailure,
  OperationOutcome,
  OperationState,
} from "./operation/index.js";
export type {
  DataViewsProvider,
  DataViewsProviderConfig,
  DeclaredRecordTypes,
  FieldHandle,
  ProviderFields,
  RecordTypes,
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
  Applicability,
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
  SourceBinding,
  SourceBindingConfig,
  SourceCapabilities,
  SourceHost,
  SourceRequest,
} from "./source/index.js";
export {
  createArraySource,
  createPage,
  createQuerySource,
  createRelaySource,
  createSourceBinding,
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
