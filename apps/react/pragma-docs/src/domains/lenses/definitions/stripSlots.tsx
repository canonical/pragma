import { useRouterState } from "@canonical/router-react";
import type React from "react";
import { Suspense } from "react";
import { useLazyLoadQuery } from "react-relay";
import ErrorBoundary from "#lib/ErrorBoundary/index.js";
import type { DefinitionsExplorerQuery } from "#relay/__generated__/DefinitionsExplorerQuery.graphql.js";
import definitionsExplorerQueryNode from "#relay/__generated__/DefinitionsExplorerQuery.graphql.js";
import {
  definitionsExplorerVariables,
  readTermParam,
} from "./definitionsQuery.js";
import { ExplorerControls, ExplorerStatus } from "./ExplorerControls/index.js";
import { abstractionOf, matchesChips, resolveFilter } from "./lensFilter.js";
import { useLensFilter } from "./lensFilterContext.js";

/**
 * The Definitions lens's mode-strip tenants — the components the routes
 * park on their `meta` under `SHELL_STRIP_META_KEY`, which the Shell
 * mounts into the strip's `controls` and `status` sockets (the P-5
 * handshake).
 *
 * They take NO props: `StripSlotsEntry` carries component types, not
 * elements, so the frame constructs them with nothing. The FILTER reaches
 * them through `lensFilterContext` (see that module for why a context is
 * the smallest mechanism that crosses the frame boundary).
 *
 * THE DATA does NOT come through that context, and the reason is the SSR
 * determinism rule. An announcement from the explorer could only arrive in
 * an effect — client-only, after paint — so the strip would render empty
 * on the server and populated on the client: a hydration mismatch in the
 * frame itself. Instead these components read the SAME operation the
 * explorer reads, from the same warm store: the Shell renders inside
 * `RelayEnvironmentProvider`, and the route's prepare step has already
 * executed and serialised exactly this query. The read is a store hit on
 * both sides, the markup matches, and no second network request exists —
 * the one-operation-per-page register holds, because this is the same
 * operation with the same variables, not another one.
 *
 * THE FRAME MUST NEVER DEPEND ON WARM DATA. `useLazyLoadQuery` SUSPENDS on
 * a cold store, and these components render inside the Shell — outside any
 * page-level boundary. Unguarded, a cold render (the backend-less preview
 * bricks, a failed prepare step) suspends the whole document and takes the
 * frame, the rail and the canvas down with it; `entry.tests.tsx` caught
 * exactly that. So each socket carries its OWN Suspense and error
 * boundary, both falling back to nothing: an empty socket is the honest
 * rendering of "the graph did not answer", and the strip band —
 * stationary frame (AX.6) — stays intact either way.
 */

/** Read the current term exactly as the page does, so the strip's query
 * variables match the explorer's and hit the same warm store entry. */
const useCurrentTerm = (): string | undefined => {
  const { match } = useRouterState();
  return readTermParam(
    match?.kind === "route"
      ? ((match.params ?? {}) as Readonly<Record<string, unknown>>)
      : {},
  );
};

/**
 * Wrap a socket so it can never destabilise the frame: it renders its
 * content when the store is warm, and nothing at all otherwise.
 */
const guarded = (Content: React.ComponentType): (() => React.ReactElement) => {
  const Guarded = (): React.ReactElement => (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <Content />
      </Suspense>
    </ErrorBoundary>
  );
  return Guarded;
};

/**
 * The chip toolbar. The ontologies are labelled by their own prefixes —
 * the vocabulary readers already meet in term addresses — so nothing here
 * invents a display name the graph does not have.
 */
const ControlsContent = (): React.ReactElement => {
  const term = useCurrentTerm();
  const data = useLazyLoadQuery<DefinitionsExplorerQuery>(
    definitionsExplorerQueryNode,
    definitionsExplorerVariables(term),
  );
  const { filter, setFilter } = useLensFilter();
  const prefixes = data.ontologies.map((ontology) => ontology.prefix);

  return (
    <ExplorerControls
      filter={resolveFilter(filter, prefixes)}
      namespaceLabels={prefixes.map((prefix) => ({ prefix, label: prefix }))}
      onFilterChange={setFilter}
    />
  );
};

/**
 * The status figure: how many classes the current filter shows, out of how
 * many exist, and how many of those are abstract. It counts with the SAME
 * predicate the well hides by, over the same query data and through the
 * same `resolveFilter`, so the figure and the graph cannot disagree.
 */
const StatusContent = (): React.ReactElement => {
  const term = useCurrentTerm();
  const data = useLazyLoadQuery<DefinitionsExplorerQuery>(
    definitionsExplorerQueryNode,
    definitionsExplorerVariables(term),
  );
  const { filter } = useLensFilter();
  const prefixes = data.ontologies.map((ontology) => ontology.prefix);
  const effective = resolveFilter(filter, prefixes);

  const census = data.ontologies.flatMap((ontology) =>
    ontology.classes.map((klass) => ({
      prefix: ontology.prefix,
      isAbstract: klass.isAbstract,
    })),
  );
  const visible = census.filter((entry) =>
    matchesChips(effective, entry.isAbstract, entry.prefix),
  );
  const abstractCount = visible.filter(
    (entry) => abstractionOf(entry.isAbstract) === "abstract",
  ).length;

  return (
    <ExplorerStatus
      abstract={abstractCount}
      total={census.length}
      visible={visible.length}
    />
  );
};

export const definitionsStripSlots = {
  Controls: guarded(ControlsContent),
  Status: guarded(StatusContent),
} as const;
