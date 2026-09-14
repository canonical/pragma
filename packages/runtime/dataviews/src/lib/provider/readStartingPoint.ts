import type { Collection } from "../collection/index.js";
import type { QueryLocation } from "../location/index.js";
import {
  NO_PRESENTATION,
  type ViewPresentation,
} from "../presentation/index.js";
import type { RowRecord } from "../rows/index.js";
import type { SchemaFieldDefinition } from "../schema/index.js";
import type { DataViewsSnapshot } from "../snapshot/index.js";
import type { SourceCapabilities } from "../source/index.js";
import { decodeQuery, readOpenView } from "../wire/index.js";
import isCarryingQuery from "./isCarryingQuery.js";
import type { StartingPoint } from "./types.js";

/** What a starting point is read from: the provider's configuration. */
type StartingPointConfig<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object,
> = {
  readonly collection: Collection<TFields, TRow>;
  readonly capabilities: SourceCapabilities;
  readonly location: QueryLocation | undefined;
  readonly snapshot: DataViewsSnapshot | undefined;
  /** Whether the provider keeps saved views, so a view can ever be shown. */
  readonly keepsViews: boolean;
};

/**
 * Whether a value handed over as an arrangement is one: a plain keyed
 * record. A snapshot crosses a JSON boundary, so its shape is checked, never
 * trusted.
 */
const isArrangement = (value: unknown): value is ViewPresentation =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * A snapshot as it crosses a JSON boundary, checked whole: its query when it
 * is text and none otherwise, its arrangement when it is a keyed record and
 * none otherwise, or no snapshot at all when the value is not an object.
 */
const parseSnapshot = (value: unknown): DataViewsSnapshot | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const query = "query" in value ? value.query : undefined;
  const presentation = "presentation" in value ? value.presentation : undefined;
  return {
    query: typeof query === "string" ? query : "",
    presentation: isArrangement(presentation) ? presentation : NO_PRESENTATION,
  };
};

/**
 * Read where a provider starts, before anything observes it. The snapshot's
 * query is decoded as a location's is, what it refuses left out and reported;
 * its arrangement is taken only when it is a keyed record, and none otherwise,
 * and one drawn under an open view only where the provider stands on that view
 * and keeps views. The location is read once: when it carries a query, that
 * query is where the provider stands, with what it refused. The open view is
 * read from the same parameters the query came from — the location's, or the
 * snapshot's. Nothing is subscribed and nothing requested.
 *
 * @note Impure by design: it reads the location port once, which is what
 * standing on the location's query before anything observes it takes.
 */
export default function readStartingPoint<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>(config: StartingPointConfig<TFields, TRow>): StartingPoint {
  const { collection, capabilities, location, snapshot, keepsViews } = config;
  const { schema } = collection;
  /** A set of parameters as the provider reads it: decoded, with its open view. */
  const readParams = (params: URLSearchParams | null) =>
    params === null
      ? null
      : {
          decoded: decodeQuery({ schema, params, capabilities }),
          view: readOpenView(params),
        };
  const handed = parseSnapshot(snapshot);
  const fromSnapshot = readParams(
    handed === null ? null : new URLSearchParams(handed.query),
  );
  const params = location?.read();
  const fromLocation = readParams(
    params !== undefined && isCarryingQuery({ params, schema, keepsViews })
      ? params
      : null,
  );
  // What the provider stands on: the location when it carries a query, the
  // snapshot otherwise.
  const standing = fromLocation ?? fromSnapshot;
  const view = standing?.view ?? null;
  const snapshotView = fromSnapshot?.view ?? null;
  // An arrangement drawn under a view belongs to that view: it is restored
  // only where the provider stands on the same view and can show it, never
  // beneath another view or none, where nothing would let it go.
  const restoresArrangement =
    snapshotView === null || (keepsViews && snapshotView === view);
  return {
    start:
      fromSnapshot === null
        ? undefined
        : {
            slice: fromSnapshot.decoded.slice,
            window: fromSnapshot.decoded.window,
          },
    initial:
      fromLocation === null
        ? undefined
        : {
            slice: fromLocation.decoded.slice,
            window: fromLocation.decoded.window,
          },
    issues: standing?.decoded.issues ?? [],
    // A provider keeping no views can show none, so it stands on none.
    view: keepsViews ? view : null,
    restored:
      handed !== null && restoresArrangement
        ? { view: snapshotView, presentation: handed.presentation }
        : undefined,
  };
}
