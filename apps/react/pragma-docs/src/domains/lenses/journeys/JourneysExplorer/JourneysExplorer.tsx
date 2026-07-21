import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { JourneysExplorerQuery } from "#relay/__generated__/JourneysExplorerQuery.graphql.js";
import journeysExplorerQueryNode from "#relay/__generated__/JourneysExplorerQuery.graphql.js";
import {
  collectJourneys,
  describeCoordinate,
  localName,
} from "../collectJourneys.js";
import { JourneyInspector } from "../JourneyInspector/index.js";
import { JourneyRail } from "../JourneyRail/index.js";
import { JourneyTable } from "../JourneyTable/index.js";
import { JourneyWell } from "../JourneyWell/index.js";
import {
  defaultJourneyFilter,
  type JourneyFilter,
  personaMatchesCoordinate,
} from "../journeyFilter.js";
import { journeysExplorerVariables } from "../journeysQuery.js";
import {
  buildJourneyRows,
  DEFAULT_TABLE_STATE,
  type JourneyTableState,
} from "../journeyTableModel.js";
import type { JourneysExplorerProps } from "./types.js";
import "./styles.css";

/**
 * Codegen source of truth for `JourneysExplorerQuery`. Never invoked (this
 * module rides the server bricks' native import chain, where an evaluated
 * tag throws at module scope).
 *
 * THE QUERY ROOTS AT `pairings`, AND THAT IS THE WHOLE DESIGN.
 *
 * The naive shape — root at `views` and walk down — structurally CANNOT
 * see this model: `Lens` is a separate type from `View`, so the 11
 * `composes` edges that hang off lenses are invisible from a `views` root.
 * Rooting at `pairings` and reading `pairsSurface` through the `Surface`
 * INTERFACE sees every implementor at once (`View`, `Lens`, `Port`,
 * `Peek`, `Detail`, `Mechanism`, `ComposerSurface`, `Editor` — all eight,
 * verified live). `composes` is declared ON the interface, so no inline
 * fragments are needed at all: one selection set covers every surface kind.
 *
 * THE TWO WINDOWS. `first:` hard-caps at 100 and the model holds 133
 * pairings, so ONE page silently loses 13 of the 51 paired jobs. The union
 * of `first:100` and `last:100` covers all 133 in ONE operation with no
 * cursor threading (see `journeysQuery.ts` for the full argument);
 * `collectJourneys` merges them by URI, so the 67-pairing overlap
 * collapses to nothing.
 *
 * `jobs` IS ALSO PAGINATED, deliberately. Its connection defaults to FIFTY
 * — measured — so the two jobs beyond that would vanish without an
 * explicit `first`. The variable is named and asserted rather than left to
 * a default that is not documented anywhere in the schema.
 *
 * `arrivals` and `pairingRole` are OBJECT types carrying URIs, not enums,
 * and 34 of 133 pairings carry no arrival — so both are read as nullable
 * URI-bearing nodes and mapped by local name downstream.
 */
const journeysExplorerQuerySource = (): unknown => graphql`
  query JourneysExplorerQuery(
    $jobs: Int!
    $pairings: Int!
    $uri: String!
    $hasJob: Boolean!
  ) {
    jobs(first: $jobs) {
      edges {
        node {
          uri
          story
          acceptances
          coordinates {
            uri
            actors { edges { node { uri } } }
            roles { edges { node { uri } } }
            fluencies { edges { node { uri } } }
          }
        }
      }
    }
    # The two overlapping windows — the union covers all 133 pairings.
    #
    # The selection set is spelled out TWICE rather than shared through a
    # fragment, and that is deliberate: Relay MASKS fragment data, so a
    # window fragment spread would hand this component an opaque fragment
    # reference it cannot read. The union merge is a plain data operation
    # over both windows (see collectJourneys), not a rendering concern
    # delegated to a child, so there is no component to own such a
    # fragment. Duplication here buys directly readable data; the two
    # windows are pinned identical by journeysQuery.tests.ts.
    head: pairings(first: $pairings) {
      edges {
        node {
          uri
          pairingRole { uri }
          forJob { uri }
          arrivals { edges { node { uri } } }
          pairsSurface {
            __typename
            uri
            composes { edges { node { uri name } } }
          }
        }
      }
    }
    tail: pairings(last: $pairings) {
      edges {
        node {
          uri
          pairingRole { uri }
          forJob { uri }
          arrivals { edges { node { uri } } }
          pairsSurface {
            __typename
            uri
            composes { edges { node { uri name } } }
          }
        }
      }
    }
    personas {
      edges {
        node {
          uri
        }
      }
    }
    # The selected job rides the same operation behind @include, exactly as
    # the definitions lens's term lookup does.
    job(uri: $uri) @include(if: $hasJob) {
      uri
    }
  }
`;
void journeysExplorerQuerySource;

const componentCssClassName = "ds journeys-explorer";

/**
 * The Journeys lens's route root: the demand model as a triptych — the
 * demand index west, the journey spine in its underground well centre, the
 * job inspector east. ONE `useLazyLoadQuery` per page; the variables come
 * from the same builder the server prepare step and the prefetch seam use
 * (`journeysQuery.ts`), so the SSR-warmed store always fulfils this exact
 * operation.
 *
 * THE SCALE RULING, and why the default view is filtered. The full model
 * is ~260 nodes across five columns — unreadable at once, and
 * virtualisation is not open to us: React Flow SSRs only the nodes it is
 * given, so virtualising would break the determinism contract the well
 * depends on. So the lens DEFAULTS to one coordinate (the first by URI
 * order) and the rail offers the rest. That default is a pure function of
 * the query's own data, so it is identical on the server and the client.
 *
 * THE SSR DETERMINISM RULE. The filter's initial value is computed from
 * query data alone — never `localStorage`, `window` or the query string —
 * and the well has no client-only state whatsoever. Selection IS
 * server-rendered: it comes from the URL (`job`), identical on both sides.
 */
const JourneysExplorer = ({
  className,
  job,
}: JourneysExplorerProps): React.ReactElement => {
  const data = useLazyLoadQuery<JourneysExplorerQuery>(
    journeysExplorerQueryNode,
    journeysExplorerVariables(job),
  );

  // The join: jobs + both pairing windows → the coordinate tree. Pure, and
  // memoised for identity as much as for cost (the well is laid out from
  // this value).
  const coordinates = useMemo(
    () =>
      collectJourneys(
        data.jobs.edges.map((edge) => edge.node),
        [
          data.head.edges.map((edge) => edge.node),
          data.tail.edges.map((edge) => edge.node),
        ],
      ),
    [data.jobs, data.head, data.tail],
  );

  // Each coordinate's role axis, for the rail's APPROXIMATE persona match.
  const rolesByCoordinate = useMemo(() => {
    const table: Record<string, readonly string[]> = {};
    for (const edge of data.jobs.edges) {
      const coordinate = edge.node.coordinates;
      if (coordinate == null) continue;
      table[coordinate.uri] = (coordinate.roles?.edges ?? []).map(
        (roleEdge) => roleEdge.node.uri,
      );
    }
    return table;
  }, [data.jobs]);

  const personas = useMemo(
    () => data.personas.edges.map((edge) => edge.node.uri),
    [data.personas],
  );

  const coordinateUris = useMemo(
    () => coordinates.map((coordinate) => coordinate.uri),
    [coordinates],
  );

  // The coordinate the SELECTED job belongs to, so a link straight to a
  // job lands on a diagram that actually contains it.
  const selectedCoordinate = useMemo(() => {
    if (job === undefined) return undefined;
    return coordinates.find((coordinate) =>
      coordinate.jobs.some((entry) => entry.uri === job),
    )?.uri;
  }, [coordinates, job]);

  // The initial filter is DATA-DERIVED (plus the URL's job, which both
  // sides hold before first render), so server and client compute it alike.
  const [filter, setFilter] = useState<JourneyFilter>(() =>
    defaultJourneyFilter(coordinateUris, selectedCoordinate),
  );

  // What the WELL draws: the filtered set. The rail still receives every
  // coordinate — it dims, it never hides.
  const drawn = useMemo(
    () =>
      coordinates.filter(
        (coordinate) =>
          (filter.coordinate === undefined ||
            filter.coordinate === coordinate.uri) &&
          personaMatchesCoordinate(
            filter.persona,
            rolesByCoordinate[coordinate.uri] ?? [],
          ),
      ),
    [coordinates, filter, rolesByCoordinate],
  );

  // The per-job detail the TABLE's columns need beyond the coordinate
  // tree: the story, the acceptance criteria and both axes, keyed by job
  // URI. Pure projection of the same query data.
  const jobDetail = useMemo(() => {
    const table: Record<
      string,
      {
        story?: string | undefined;
        acceptances?: readonly string[] | undefined;
        roles?: readonly string[] | undefined;
        fluencies?: readonly string[] | undefined;
      }
    > = {};
    for (const edge of data.jobs.edges) {
      const node = edge.node;
      table[node.uri] = {
        story: node.story ?? undefined,
        acceptances: (node.acceptances ?? []).filter(
          (value): value is string => typeof value === "string",
        ),
        roles: (node.coordinates?.roles?.edges ?? []).map(
          (roleEdge) => roleEdge.node.uri,
        ),
        fluencies: (node.coordinates?.fluencies?.edges ?? []).map(
          (fluencyEdge) => fluencyEdge.node.uri,
        ),
      };
    }
    return table;
  }, [data.jobs]);

  // The table's rows: EVERY job the model carries, flattened. The table is
  // the lens's primary surface, so it is handed the unfiltered set — the
  // coordinate filter narrows the WELL (a diagram of 52 journeys at once
  // is unreadable), never the index.
  const rows = useMemo(
    () => buildJourneyRows(coordinates, jobDetail),
    [coordinates, jobDetail],
  );

  // THE TABLE'S EPHEMERAL ARRANGEMENT (P-D7). Sort, group and expansion
  // are client state and never enter the URL — only the selected job is
  // addressable. The initial value is a pure CONSTANT, which is the
  // strongest form of the SSR determinism argument: there is nothing for
  // the server and the client to disagree about, so the default sort and
  // grouping are applied by the same pure comparators on both sides and
  // the first paint matches byte for byte. Never seeded from
  // `localStorage`, `window` or the query string.
  const [tableState, setTableState] =
    useState<JourneyTableState>(DEFAULT_TABLE_STATE);

  // Expansion starts EMPTY on both sides, for the same reason.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  const toggleExpanded = useCallback((uri: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(uri)) next.delete(uri);
      else next.add(uri);
      return next;
    });
  }, []);

  // The selected job, resolved against the model already in hand — no
  // second query: the whole demand model is one operation.
  const inspected = useMemo(() => {
    if (job === undefined) return undefined;
    for (const coordinate of coordinates) {
      for (const entry of coordinate.jobs) {
        if (entry.uri !== job) continue;
        const raw = data.jobs.edges.find((edge) => edge.node.uri === job)?.node;
        return {
          uri: entry.uri,
          label: entry.label ?? localName(entry.uri),
          story: raw?.story ?? undefined,
          acceptances: (raw?.acceptances ?? []).filter(
            (value): value is string => typeof value === "string",
          ),
          coordinate: describeCoordinate(raw?.coordinates),
          pairings: entry.pairings,
        };
      }
    }
    return undefined;
  }, [coordinates, data.jobs, job]);

  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <JourneyRail
        coordinates={coordinates}
        filter={filter}
        job={job}
        onFilterChange={setFilter}
        personas={personas}
        rolesByCoordinate={rolesByCoordinate}
      />
      {/* THE PRIMARY SURFACE. The table carries all 52 jobs with their
          descriptions, sortable and groupable; the well below it is the
          SELECTED journey's shape. That is the honest relationship — a
          diagram is good at one journey and bad at 52 at once. */}
      <div className="journeys-explorer-main">
        <JourneyTable
          expanded={expanded}
          job={job}
          onStateChange={setTableState}
          onToggleExpanded={toggleExpanded}
          rows={rows}
          state={tableState}
        />
        <JourneyWell coordinates={drawn} job={job} />
      </div>
      <JourneyInspector job={inspected} />
    </div>
  );
};

export default JourneysExplorer;
