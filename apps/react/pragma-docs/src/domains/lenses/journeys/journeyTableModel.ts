/**
 * The journeys table's MODEL: the demand model flattened into rows, and
 * the pure comparators that order and group them.
 *
 * WHY A TABLE AT ALL. The lens shipped its primary surface as a nested
 * `<ul>` — coordinate → jobs — which affords exactly ONE arrangement. The
 * interesting questions a demand model is asked ("which jobs are
 * unserved?", "which coordinate carries the most demand?", "what does the
 * architect actually have?") are SORT and GROUP questions, and a bulleted
 * list cannot answer any of them. The data is genuinely tabular: 52 rows
 * with several honest columns, every one of them already in the query.
 *
 * PURE BY CONSTRUCTION, and that is the SSR contract. `buildJourneyRows`,
 * `compareRows` and `groupRows` are functions of their arguments alone —
 * no `Date`, no `Math.random`, no `localStorage`, no `window`, no reading
 * of the query string. The DEFAULT sort and group are therefore applied
 * identically on the server and on the client's first render, so the first
 * paint matches byte for byte. User re-sorts are client-only state layered
 * on top, exactly as the definitions lens's filter is. This is the same
 * argument `buildJourneyGraph` makes for positions, made here for order.
 *
 * SORT IS TOTAL. Every comparator falls back to the row's URI, which is
 * unique, so no two rows ever compare equal. That matters more than it
 * looks: `Array.prototype.sort` is stable per spec, but a comparator with
 * ties would make the rendered order depend on the INPUT order, and the
 * input order is the graph's iteration order — the exact thing
 * `buildJourneyGraph` refuses to trust. A total order cannot drift.
 */

import { axisTerm, localName } from "./collectJourneys.js";
import type {
  JourneyCoordinate,
  JourneyPairing,
} from "./JourneyWell/buildJourneyGraph.js";

/** The columns the table can be ordered by. */
export type JourneySortKey =
  | "job"
  | "coordinate"
  | "role"
  | "fluency"
  | "pairings"
  | "surface"
  | "served";

/** The arrangements the table can be grouped into. */
export type JourneyGroupKey = "coordinate" | "role" | "served" | "none";

export type SortDirection = "ascending" | "descending";

/** The table's whole ephemeral arrangement. */
export interface JourneyTableState {
  readonly sort: JourneySortKey;
  readonly direction: SortDirection;
  readonly group: JourneyGroupKey;
}

/**
 * The DEFAULT arrangement — grouped by coordinate, jobs alphabetical
 * within each group.
 *
 * This is deliberately the arrangement the old nested list had: the
 * rebuild must not silently change what a returning reader sees at the
 * same address. It is a constant, not a computation, which is the
 * strongest possible form of the determinism argument — there is nothing
 * for the server and the client to disagree about.
 */
export const DEFAULT_TABLE_STATE: JourneyTableState = {
  sort: "job",
  direction: "ascending",
  group: "coordinate",
};

/** One job, flattened — every column the table shows, already resolved. */
export interface JourneyRow {
  /** The job's graph URI: its address, and the sort's tiebreak. */
  readonly uri: string;
  readonly label: string;
  /** The job's story, VERBATIM. Undefined when the graph holds none. */
  readonly story: string | undefined;
  /** The acceptance criteria, each verbatim. */
  readonly acceptances: readonly string[];
  readonly coordinateUri: string;
  /** The coordinate spelled out in words, wildcards included. */
  readonly coordinateLabel: string;
  /** The role axis's terms; EMPTY is the ontology's "any role" wildcard. */
  readonly roles: readonly string[];
  /** The fluency axis's terms; empty is likewise "any fluency". */
  readonly fluencies: readonly string[];
  readonly pairings: readonly JourneyPairing[];
  /** Pairings whose role is primary, and the rest. Counted, not guessed. */
  readonly primaryCount: number;
  readonly secondaryCount: number;
  /** The first surface this job lands on, by URI order. */
  readonly surfaceLabel: string | undefined;
  readonly surfaceHref: string | undefined;
  /** Does ANY surface serve this job? The model's sharpest single fact. */
  readonly served: boolean;
}

/**
 * The wildcard axis, rendered as the ontology reads it. An absent role or
 * fluency axis is not a gap — the ontology states it MATCHES ANYTHING — so
 * the cell says "any", which reports the data rather than padding it. This
 * is the same reading `describeCoordinate` applies.
 */
export const ANY_AXIS = "any";

/** An axis's cell text: its terms joined, or the wildcard word. */
export const axisText = (terms: readonly string[]): string =>
  terms.length === 0 ? ANY_AXIS : terms.join(", ");

/**
 * Is a pairing's role the PRIMARY one? Read from the graph's own term
 * (`pairingRole` carries a URI like `…#role.primary`), never inferred from
 * position. A pairing with no role at all counts as secondary rather than
 * primary: claiming an unstated pairing is the primary one would be the
 * lens asserting something the model does not say.
 */
const isPrimary = (pairing: JourneyPairing): boolean =>
  pairing.role != null &&
  localName(pairing.role).toLowerCase().includes("primary");

/**
 * Flatten the coordinate tree into rows — one row per job.
 *
 * PURE: coordinates in, rows out, nothing read from the environment. The
 * rows come out in coordinate-then-job URI order (the tree's own order),
 * which `compareRows` then imposes a total order on regardless — the
 * output order of this function is never load-bearing.
 */
export const buildJourneyRows = (
  coordinates: readonly JourneyCoordinate[],
  detail: Readonly<
    Record<
      string,
      {
        readonly story?: string | undefined;
        readonly acceptances?: readonly string[] | undefined;
        readonly roles?: readonly string[] | undefined;
        readonly fluencies?: readonly string[] | undefined;
      }
    >
  >,
): readonly JourneyRow[] => {
  const rows: JourneyRow[] = [];
  for (const coordinate of coordinates) {
    for (const job of coordinate.jobs) {
      const extra = detail[job.uri];
      // The surface the row REPORTS is the first by URI order, so the
      // choice is deterministic rather than dependent on the graph's
      // iteration order. Jobs with several surfaces say so via the count.
      const surfaces = [...job.pairings]
        .map((pairing) => pairing.surface)
        .filter(
          (surface): surface is NonNullable<typeof surface> => surface != null,
        )
        .sort((left, right) => left.uri.localeCompare(right.uri));
      const first = surfaces.at(0);
      const primaryCount = job.pairings.filter(isPrimary).length;
      rows.push({
        uri: job.uri,
        label: job.label ?? localName(job.uri),
        story: extra?.story,
        acceptances: extra?.acceptances ?? [],
        coordinateUri: coordinate.uri,
        coordinateLabel: coordinate.label ?? coordinate.uri,
        roles: (extra?.roles ?? []).map(axisTerm),
        fluencies: (extra?.fluencies ?? []).map(axisTerm),
        pairings: job.pairings,
        primaryCount,
        secondaryCount: job.pairings.length - primaryCount,
        surfaceLabel:
          first === undefined
            ? undefined
            : (first.label ?? localName(first.uri)),
        surfaceHref: first?.href ?? undefined,
        served: job.pairings.length > 0,
      });
    }
  }
  return rows;
};

/** The value a column sorts on. Strings compare by locale, numbers
 * numerically, and the served axis as a boolean rendered 0/1. */
const sortValue = (row: JourneyRow, key: JourneySortKey): string | number => {
  switch (key) {
    case "job":
      return row.label;
    case "coordinate":
      return row.coordinateLabel;
    case "role":
      return axisText(row.roles);
    case "fluency":
      return axisText(row.fluencies);
    case "pairings":
      return row.pairings.length;
    case "surface":
      // An unserved job has no surface. It sorts as the empty string, so
      // the whole unserved block lands together at one end — which is
      // precisely the reading someone sorting by surface wants.
      return row.surfaceLabel ?? "";
    case "served":
      return row.served ? 1 : 0;
  }
};

/**
 * The comparator, TOTAL by construction: every column falls back to the
 * job's URI, which is unique across the model. No two rows ever compare
 * equal, so the rendered order can never depend on the input order — the
 * graph's iteration order never leaks into what a reader sees.
 *
 * The direction flips the PRIMARY key only; the URI tiebreak stays
 * ascending, so a descending sort is a stable, reproducible mirror rather
 * than a second arbitrary arrangement.
 */
export const compareRows =
  (key: JourneySortKey, direction: SortDirection) =>
  (left: JourneyRow, right: JourneyRow): number => {
    const a = sortValue(left, key);
    const b = sortValue(right, key);
    let primary = 0;
    if (typeof a === "number" && typeof b === "number") primary = a - b;
    else primary = String(a).localeCompare(String(b));
    if (primary !== 0) return direction === "ascending" ? primary : -primary;
    return left.uri.localeCompare(right.uri);
  };

/** Sort a row set — a new array; the input is never mutated. */
export const sortRows = (
  rows: readonly JourneyRow[],
  key: JourneySortKey,
  direction: SortDirection,
): readonly JourneyRow[] => [...rows].sort(compareRows(key, direction));

/** One rendered group: its heading and its rows, already ordered. */
export interface JourneyGroup {
  /** A stable key for React and for the group header's `id`. */
  readonly key: string;
  readonly label: string;
  readonly rows: readonly JourneyRow[];
}

/** The group a row belongs to, per axis. */
const groupOf = (
  row: JourneyRow,
  key: JourneyGroupKey,
): { key: string; label: string } => {
  switch (key) {
    case "coordinate":
      return { key: row.coordinateUri, label: row.coordinateLabel };
    case "role":
      // The APPROXIMATE persona axis, grouped honestly: a job with no
      // role axis groups under the wildcard word, not under a made-up
      // persona. The lens's persona note says why this axis is soft.
      return { key: axisText(row.roles), label: axisText(row.roles) };
    case "served":
      return row.served
        ? { key: "served", label: "Served" }
        : { key: "unserved", label: "Unserved" };
    case "none":
      return { key: "all", label: "All jobs" };
  }
};

/**
 * Group rows, then order within each group — the arrangement the table
 * renders. PURE, and deterministic in BOTH dimensions: groups come out in
 * the order of their first row under the active sort, so the group order
 * is itself a function of the same total order the rows use. Nothing here
 * depends on `Map` insertion luck beyond that first-row rule, which is
 * stated rather than assumed.
 */
export const groupRows = (
  rows: readonly JourneyRow[],
  state: JourneyTableState,
): readonly JourneyGroup[] => {
  const ordered = sortRows(rows, state.sort, state.direction);
  const buckets = new Map<string, { label: string; rows: JourneyRow[] }>();
  for (const row of ordered) {
    const { key, label } = groupOf(row, state.group);
    const bucket = buckets.get(key) ?? { label, rows: [] };
    bucket.rows.push(row);
    buckets.set(key, bucket);
  }
  return [...buckets.entries()].map(([key, bucket]) => ({
    key,
    label: bucket.label,
    rows: bucket.rows,
  }));
};

/**
 * The `aria-sort` value for a column header — `ascending`/`descending` on
 * the ACTIVE column, `none` everywhere else. WAI-ARIA is explicit that at
 * most one column may claim a direction at a time, so this is derived
 * rather than stored per column: it cannot get out of step.
 */
export const ariaSortFor = (
  column: JourneySortKey,
  state: JourneyTableState,
): "ascending" | "descending" | "none" =>
  column === state.sort ? state.direction : "none";

/**
 * Pressing a column header. The same column TOGGLES direction; a new
 * column takes over at ascending — the convention every table UI uses, so
 * a reader's hands already know it.
 */
export const toggleSort = (
  state: JourneyTableState,
  column: JourneySortKey,
): JourneyTableState =>
  column === state.sort
    ? {
        ...state,
        direction: state.direction === "ascending" ? "descending" : "ascending",
      }
    : { ...state, sort: column, direction: "ascending" };
