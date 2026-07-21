import { Link } from "@canonical/router-react";
import type React from "react";
import { PERSONA_MATCH_NOTE } from "../journeyFilter.js";
import {
  ariaSortFor,
  axisText,
  groupRows,
  type JourneyGroupKey,
  type JourneySortKey,
  toggleSort,
} from "../journeyTableModel.js";
import type { JourneyTableProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds journey-table";

/** The column set, in render order. Each column names the sort key it
 * carries; `undefined` marks a column that is not sortable (the expander,
 * whose order is the row's order by definition). */
const COLUMNS: readonly {
  readonly key: JourneySortKey;
  readonly label: string;
  readonly numeric?: boolean;
}[] = [
  { key: "job", label: "Job" },
  { key: "coordinate", label: "Coordinate" },
  { key: "role", label: "Role" },
  { key: "fluency", label: "Fluency" },
  { key: "pairings", label: "Pairings", numeric: true },
  { key: "surface", label: "Surface" },
  { key: "served", label: "State" },
];

/** The grouping axes the control strip offers. */
const GROUPS: readonly { readonly key: JourneyGroupKey; readonly label: string }[] =
  [
    { key: "coordinate", label: "Coordinate" },
    { key: "role", label: "Role" },
    { key: "served", label: "State" },
    { key: "none", label: "Flat" },
  ];

/**
 * The Journeys lens's PRIMARY SURFACE: the demand model as a groupable,
 * sortable table.
 *
 * WHY THIS REPLACED A LIST. The lens shipped its index as a nested `<ul>`
 * showing a job's LABEL and nothing else, while the graph carried the
 * story, the acceptance criteria, the coordinate, the pairing counts and
 * the served state all along. A two-level bulleted list affords exactly one
 * arrangement and cannot answer the questions the model exists to answer
 * ("which jobs are unserved?", "which coordinate carries the most
 * demand?"). Those are sort and group questions. So the table is the
 * primary surface and the well is the SELECTED JOB'S detail — the honest
 * relationship, since the graph is good at one journey's shape and bad at
 * 52 at once (which is why it needed a default coordinate filter at all).
 *
 * A REAL TABLE, because the semantics are the accessibility. There is no
 * Table in the design system, so these are hand-rolled and deliberate:
 *
 * - a `<caption>` naming the table and stating its live row count;
 * - `<th scope="col">` for every column, `<th scope="row">` for the job
 *   cell, so a screen reader announces "Pairings, 3" against the job's own
 *   name rather than against a bare row number;
 * - `aria-sort` on the ACTIVE column only (WAI-ARIA allows at most one),
 *   derived by `ariaSortFor` so it cannot drift out of step;
 * - the sort control is a real `<button>` INSIDE the `<th>`, never a click
 *   handler on the cell — so it is tab-reachable and Enter/Space-operable
 *   for free, and its accessible name says what pressing it will do;
 * - grouping is one `<tbody>` PER GROUP, each opened by a group header row
 *   whose cell is a `<th colspan scope="colgroup">`. `scope="colgroup"`
 *   is the one scope value that does not corrupt the row/column
 *   relationship of the data rows beneath it;
 * - expansion puts the detail in a `<tr>` IMMEDIATELY FOLLOWING its row —
 *   DOM order, never a portal — with `aria-expanded` and `aria-controls`
 *   on the trigger, so the story and the acceptance criteria are one
 *   interaction away rather than one navigation away.
 *
 * SSR DETERMINISM. Sort, group and expansion are EPHEMERAL client state
 * and never enter the URL. The DEFAULT arrangement is a pure constant
 * applied by pure comparators (`journeyTableModel.ts`), so the server's
 * first paint and the client's first render produce identical markup.
 * Nothing here is ever seeded from `localStorage`, `window` or the query
 * string — that is the React 19 hydration mismatch a `console.error` spy
 * will not catch.
 */
const JourneyTable = ({
  className,
  rows,
  state,
  onStateChange,
  expanded,
  onToggleExpanded,
  job,
}: JourneyTableProps): React.ReactElement => {
  const groups = groupRows(rows, state);
  const unserved = rows.filter((row) => !row.served).length;

  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-slot="journeys-table"
    >
      {/* The grouping control. A radio group rather than a select: the
          axes are few and fixed, and each stays visible so the current
          arrangement is readable without opening anything. */}
      <div className="journey-table-controls">
        <fieldset className="journey-table-group-control">
          <legend>Group by</legend>
          {GROUPS.map((entry) => (
            <button
              aria-pressed={state.group === entry.key}
              className="journey-table-group-button"
              key={entry.key}
              onClick={() => {
                onStateChange({ ...state, group: entry.key });
              }}
              type="button"
            >
              {entry.label}
            </button>
          ))}
        </fieldset>
        {/* The confession travels WITH the role axis wherever it appears.
            A prettier surface must not start lying: the graph records no
            persona-to-job edge, and grouping by role inherits exactly the
            approximation the persona filter carries. */}
        {state.group === "role" ? (
          <p className="journey-table-note">{PERSONA_MATCH_NOTE}</p>
        ) : null}
      </div>

      <div className="journey-table-scroll">
        <table className="journey-table-grid">
          <caption className="journey-table-caption">
            Every job in the demand model{" "}
            <span className="journey-table-count">
              {rows.length} jobs, {unserved} unserved
            </span>
          </caption>
          <thead>
            <tr>
              {/* The expander column's header is a real word for screen
                  readers, hidden visually — an empty `<th>` would leave
                  the column unannounced. */}
              <th className="journey-table-expander-head" scope="col">
                <span className="journey-table-visually-hidden">Details</span>
              </th>
              {COLUMNS.map((column) => (
                <th
                  aria-sort={ariaSortFor(column.key, state)}
                  data-numeric={column.numeric ? "true" : undefined}
                  key={column.key}
                  scope="col"
                >
                  <button
                    className="journey-table-sort"
                    onClick={() => {
                      onStateChange(toggleSort(state, column.key));
                    }}
                    type="button"
                  >
                    {column.label}
                    {/* The direction indicator is decorative: the state it
                        shows is already carried by `aria-sort` on the
                        header, so announcing it twice would be noise. */}
                    <span aria-hidden="true" className="journey-table-sort-mark">
                      {state.sort === column.key
                        ? state.direction === "ascending"
                          ? "▲"
                          : "▼"
                        : "↕"}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          {groups.map((group) => (
            <tbody key={group.key}>
              {/* The group header row. Rendered even when grouping is
                  flat, so the table's structure does not change shape
                  between arrangements — one `<tbody>` per group, always. */}
              {state.group === "none" ? null : (
                <tr className="journey-table-group-row">
                  <th
                    colSpan={COLUMNS.length + 1}
                    className="journey-table-group-header"
                    scope="colgroup"
                  >
                    {group.label}{" "}
                    <span className="journey-table-group-count">
                      {group.rows.length}
                    </span>
                  </th>
                </tr>
              )}
              {group.rows.map((row) => {
                const isExpanded = expanded.has(row.uri);
                const detailId = `journey-detail-${encodeURIComponent(row.uri)}`;
                return [
                  <tr
                    aria-current={row.uri === job ? "true" : undefined}
                    data-selected={row.uri === job ? "true" : undefined}
                    key={row.uri}
                  >
                    <td className="journey-table-expander-cell">
                      <button
                        aria-controls={detailId}
                        aria-expanded={isExpanded}
                        className="journey-table-expander"
                        onClick={() => {
                          onToggleExpanded(row.uri);
                        }}
                        type="button"
                      >
                        {/* The accessible name carries the job, so a
                            screen reader hears WHICH job it expands
                            rather than 52 identical "Details" buttons. */}
                        <span className="journey-table-visually-hidden">
                          Details for {row.label}
                        </span>
                        <span aria-hidden="true">{isExpanded ? "−" : "+"}</span>
                      </button>
                    </td>
                    {/* The row header: the job. `scope="row"` makes every
                        other cell announce against this name. */}
                    <th className="journey-table-job" scope="row">
                      <Link
                        className="journey-table-job-link"
                        params={{ job: row.uri }}
                        to="journeysJob"
                      >
                        {row.label}
                      </Link>
                      {/* THE DESCRIPTIONS THE LIST WAS MISSING: the story
                          as truncated secondary text, right here in the
                          primary surface. Full text is one expand away. */}
                      {row.story === undefined ? null : (
                        <span className="journey-table-story">{row.story}</span>
                      )}
                    </th>
                    <td className="journey-table-coordinate">
                      {row.coordinateLabel}
                    </td>
                    {/* The wildcard reads "any" — the ontology's own
                        reading of an unconstrained axis, not a gap. */}
                    <td data-wildcard={row.roles.length === 0 ? "true" : undefined}>
                      {axisText(row.roles)}
                    </td>
                    <td
                      data-wildcard={row.fluencies.length === 0 ? "true" : undefined}
                    >
                      {axisText(row.fluencies)}
                    </td>
                    <td data-numeric="true">
                      {row.pairings.length}
                      {row.pairings.length === 0 ? null : (
                        <span className="journey-table-split">
                          {row.primaryCount}P / {row.secondaryCount}S
                        </span>
                      )}
                    </td>
                    <td>
                      {row.surfaceLabel === undefined ? (
                        <span className="journey-table-absent">—</span>
                      ) : row.surfaceHref === undefined ? (
                        // A surface the docsite does not render is plain
                        // text: a dead link is a worse lie than no link.
                        <span>{row.surfaceLabel}</span>
                      ) : (
                        <a href={row.surfaceHref}>{row.surfaceLabel}</a>
                      )}
                    </td>
                    <td>
                      <span
                        className="journey-table-state"
                        data-served={row.served ? "true" : "false"}
                      >
                        {row.served ? "Served" : "Unserved"}
                      </span>
                    </td>
                  </tr>,
                  // The detail row, in DOM order immediately after its own
                  // row. Always rendered, `hidden` when collapsed: the
                  // markup is identical on the server and the client's
                  // first render, which is the determinism contract.
                  <tr
                    className="journey-table-detail-row"
                    hidden={!isExpanded}
                    id={detailId}
                    key={`${row.uri}-detail`}
                  >
                    <td colSpan={COLUMNS.length + 1}>
                      <div className="journey-table-detail">
                        {row.story === undefined ? null : (
                          // VERBATIM, as the graph holds it — the whole
                          // value of a demand model is the reader's own
                          // words, so it is never summarised here.
                          <blockquote className="journey-table-detail-story">
                            {row.story}
                          </blockquote>
                        )}
                        {row.acceptances.length === 0 ? null : (
                          <div className="journey-table-acceptance">
                            <h3>Acceptance</h3>
                            <ul>
                              {row.acceptances.map((acceptance) => (
                                <li key={acceptance}>{acceptance}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {row.served ? null : (
                          // The single most actionable fact the lens can
                          // surface, stated rather than left to a blank.
                          <p className="journey-table-unserved-note">
                            No surface is paired to this job.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>,
                ];
              })}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
};

export default JourneyTable;
