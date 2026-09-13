import {
  canonicalizeSlice,
  type Query,
  type Slice,
  stringifyStable,
} from "../query/index.js";
import type { Count, SourceDelivery, SourceRefusal } from "../result/index.js";
import type { RowRecord } from "../rows/index.js";
import copyCapabilities from "./copyCapabilities.js";
import describeError from "./describeError.js";
import type {
  RelayConnection,
  RelaySnapshot,
  RelaySourceConfig,
  Source,
} from "./types.js";

/** An unknown count, shared: a connection that reports none reports nothing. */
const UNKNOWN: Count = Object.freeze({ kind: "unknown" });

/**
 * Whether normalization selections carry a `@connection` handle, which the
 * Relay compiler writes wherever a query reads through `@connection` — on
 * the query itself or through an unmasked fragment. Relay merges such a
 * connection's pages into one list, so a page's data would be every page
 * read so far. A handle under a plural field belongs to each row's own
 * list, not to the page, so rows are not searched.
 */
const mergesPages = (selections: readonly unknown[]): boolean =>
  selections.some(
    (selection) =>
      typeof selection === "object" &&
      selection !== null &&
      (("handle" in selection && selection.handle === "connection") ||
        (!("plural" in selection && selection.plural === true) &&
          "selections" in selection &&
          Array.isArray(selection.selections) &&
          mergesPages(selection.selections))),
  );

/** How many queries keep their cursors for paging back and forth. */
const REMEMBERED_QUERIES = 32;

/** Why a page beyond the trail cannot be reached. */
const unreachable = (page: number): string =>
  `a forward connection reaches page ${page} only from page ${page - 1}`;

/**
 * Create a source over a forward-paginating Relay connection. Each request
 * retains its operation, delivers a page already in the store at once,
 * fetches it, and delivers every later store change to the page — a
 * mutation or a local update — so the collection follows Relay's store
 * rather than keeping a cache of its own. Releasing unsubscribes, cancels
 * the fetch and releases the retention.
 *
 * A forward connection reaches a page only through the one before it: the
 * source remembers each page's end cursor per query and page size, and
 * refuses a page it has neither a token nor a remembered cursor for, as
 * after a reload onto page three. The query pages by its own `first` and
 * `after` arguments: one paging through `@connection` is refused, since
 * Relay merges its pages. A connection with no `totalCount` counts nothing
 * rather than counting zero; a page with a missing record fails rather than
 * delivering a shorter page.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function createRelaySource<
  TQuery extends { readonly response: unknown },
  TRow extends object = RowRecord,
>(config: RelaySourceConfig<TQuery, TRow>): Source<TRow> {
  const capabilities = copyCapabilities(config.capabilities);
  const { environment } = config;
  /** Per query and page size, the cursor each reached page starts after. */
  const trails = new Map<string, Map<number, string>>();

  /** The trail one query keeps its cursors under: what it asks for, and how
   * many rows at a time. */
  const trailKey = (slice: Slice, size: number): string =>
    stringifyStable([canonicalizeSlice(slice), size]);

  /** The trail of one query, now the most recently used. */
  const trailOf = (key: string): Map<number, string> => {
    const trail = trails.get(key) ?? new Map<number, string>();
    trails.delete(key);
    trails.set(key, trail);
    for (const oldest of trails.keys()) {
      if (trails.size <= REMEMBERED_QUERIES) {
        break;
      }
      trails.delete(oldest);
    }
    return trail;
  };

  /** The cursor one page starts after, or undefined when none reaches it. */
  const cursorFor = (query: Query): string | null | undefined => {
    const { slice, window } = query;
    if (window.cursor !== null) {
      return window.cursor;
    }
    if (window.page === 1) {
      return null;
    }
    return trails.get(trailKey(slice, window.size))?.get(window.page);
  };

  return {
    capabilities,
    refusals(query: Query): readonly SourceRefusal[] {
      if (cursorFor(query) !== undefined) {
        return [];
      }
      return [
        {
          part: "window",
          code: "unreachable-page",
          field: null,
          operator: null,
          reason: unreachable(query.window.page),
        },
      ];
    },
    execute(request, deliver) {
      const { slice, window } = request;
      const key = trailKey(slice, window.size);
      const after = cursorFor(request);
      if (after === undefined) {
        // The binding refuses this before it gets here; a caller executing
        // the source itself still gets a reason rather than a wrong page.
        throw new Error(unreachable(window.page));
      }
      const operation = config.operation({ slice, first: window.size, after });
      if (mergesPages(operation.request.node.operation.selections)) {
        throw new Error(
          "a query paging through @connection merges its pages; page it by its first and after arguments instead",
        );
      }
      // Only a request that proceeds counts as using its query's cursors.
      const trail = trailOf(key);
      /** How to release what this request has acquired, newest first. */
      const acquired: (() => void)[] = [];
      const release = (): void => {
        for (const dispose of acquired.splice(0).reverse()) {
          dispose();
        }
      };
      let latest: RelaySnapshot = { data: undefined, isMissingData: true };
      /** Whether the fetch has finished, successfully or not. */
      let settled = false;
      /** What was delivered last: the data read, or a failure's reason. */
      let delivered: unknown;

      /** Deliver once per thing read: the same data or reason is not repeated. */
      const send = (what: unknown, delivery: SourceDelivery<TRow>): void => {
        if (what !== delivered) {
          delivered = what;
          deliver(delivery);
        }
      };

      const fail = (what: unknown, reason: string, cause?: unknown): void => {
        send(what, {
          status: "failed",
          failure: { reason, cause: cause ?? null, transient: null },
        });
      };

      const publish = (): void => {
        const { data, isMissingData } = latest;
        if (isMissingData) {
          // While the fetch runs, missing data is data still to come.
          if (settled) {
            fail("missing", "the store is missing data this page selects");
          }
          return;
        }
        if (data === delivered) {
          return;
        }
        let connection: RelayConnection<TRow> | null | undefined;
        try {
          // The operation's fragment reads exactly the query's response,
          // as Relay's own hooks type it.
          connection = config.connection(data as TQuery["response"]);
        } catch (error) {
          fail(data, describeError(error), error);
          return;
        }
        if (connection === null || connection === undefined) {
          fail(data, "the response carries no connection");
          return;
        }
        const { edges } = connection;
        if (edges === null || edges === undefined) {
          fail(data, "the connection carries no edges");
          return;
        }
        const rows: TRow[] = [];
        for (const edge of edges) {
          const node = edge?.node;
          if (node === null || node === undefined) {
            fail(data, "the connection carries an edge without a record");
            return;
          }
          rows.push(node);
        }
        const { endCursor, hasNextPage } = connection.pageInfo;
        // A page with no end cursor has no next page to reach any more.
        if (typeof endCursor === "string") {
          trail.set(window.page + 1, endCursor);
        } else {
          trail.delete(window.page + 1);
        }
        const matched: Count =
          typeof connection.totalCount === "number"
            ? { kind: "exact", value: connection.totalCount }
            : UNKNOWN;
        const more = typeof hasNextPage === "boolean" ? hasNextPage : null;
        send(data, {
          status: "succeeded",
          page: {
            rows,
            groups: null,
            // Nothing collapses, so the rows the window pages over are the
            // rows that matched; the whole collection is never asked for.
            counts: { pageable: matched, matched, total: UNKNOWN },
            more,
            cursors: {
              next: more === false ? null : (endCursor ?? null),
              previous: null,
            },
          },
        });
      };

      try {
        const retention = environment.retain(operation);
        acquired.push(() => retention.dispose());
        latest = environment.lookup(operation.fragment);
        const store = environment.subscribe(latest, (snapshot) => {
          latest = snapshot;
          publish();
        });
        acquired.push(() => store.dispose());
        publish();
        const fetch = environment.execute({ operation }).subscribe({
          error(error) {
            settled = true;
            fail(error, describeError(error), error);
          },
          complete() {
            settled = true;
            publish();
          },
        });
        acquired.push(() => fetch.unsubscribe());
      } catch (error) {
        // A request that cannot start holds nothing.
        release();
        throw error;
      }
      return release;
    },
    ...(config.runAction === undefined ? {} : { runAction: config.runAction }),
  };
}
