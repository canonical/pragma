import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { graphql, useFragment, useLazyLoadQuery } from "react-relay";
import type { DefinitionsExplorerQuery } from "#relay/__generated__/DefinitionsExplorerQuery.graphql.js";
import definitionsExplorerQueryNode from "#relay/__generated__/DefinitionsExplorerQuery.graphql.js";
import type { HierarchyWell_ontologies$key } from "#relay/__generated__/HierarchyWell_ontologies.graphql.js";
import hierarchyWellFragmentNode from "#relay/__generated__/HierarchyWell_ontologies.graphql.js";
import { definitionsExplorerVariables } from "../definitionsQuery.js";
import { classDepthsByUri } from "../HierarchyWell/buildClassGraph.js";
import { HierarchyWell } from "../HierarchyWell/index.js";
import { normalizeFilterText, resolveFilter } from "../lensFilter.js";
import { useLensFilter } from "../lensFilterContext.js";
import { TermInspector } from "../TermInspector/index.js";
import { TermRail } from "../TermRail/index.js";
import type { DefinitionsExplorerProps } from "./types.js";
import "./styles.css";

/**
 * Codegen source of truth for `DefinitionsExplorerQuery` — the whole
 * triptych is ONE operation (the P-2/P-5 register): the rail and well
 * fragments fan out over `ontologies`; the term lookup rides the same
 * operation behind `@include(if: $hasTerm)`, querying BOTH `ontologyClass`
 * and `ontologyProperty` because a term address does not encode which one
 * it names — whichever is non-null wins in the inspector. `prefix` /
 * `namespace` also ride at the root for the inspector's URI codec (the
 * graph returns full IRIs; term addresses are prefixed — see `uris.ts`).
 * The hook consumes the generated node because this module sits on the
 * server bricks' native import chain (routes → DefinitionsPage → here).
 * Never invoked.
 */
const definitionsExplorerQuerySource = (): unknown => graphql`
  query DefinitionsExplorerQuery($uri: String!, $hasTerm: Boolean!) {
    ontologies {
      prefix
      namespace
      # The class facets the mode strip's chips filter on and its status
      # figure counts. They ride the ROOT (not only the fragments) because
      # the strip renders in the frame, outside this page's subtree, and
      # Relay masks fragment data — the strip reads this same operation
      # from the same warm store, so it must be able to see them.
      classes {
        uri
        isAbstract
      }
      ...TermRail_ontologies
      ...HierarchyWell_ontologies
    }
    ontologyClass(uri: $uri) @include(if: $hasTerm) {
      ...TermInspector_class
    }
    ontologyProperty(uri: $uri) @include(if: $hasTerm) {
      ...TermInspector_property
    }
  }
`;
void definitionsExplorerQuerySource;

const componentCssClassName = "ds definitions-explorer";

/**
 * The Definitions lens's route root: the ontology-explorer triptych —
 * term rail west, the class hierarchy in its underground well centre,
 * term inspector east. ONE `useLazyLoadQuery` per page; the variables
 * come from the same builder the server prepare step and the prefetch
 * seam use (`definitionsQuery.ts`), so the SSR-warmed store always
 * fulfils this exact operation.
 *
 * The lens's EPHEMERAL filter lives in `lensFilterContext` rather than in
 * this component's own state, for one specific reason recorded there in
 * full: the mode strip's chips are mounted BY THE FRAME (Shell reads the
 * route's static `meta`), so they are siblings of the canvas and no prop
 * path reaches them. Context is the smallest mechanism that crosses that
 * boundary. Everything else still flows as props from here.
 *
 * THE SSR DETERMINISM RULE. The context's initial filter is the no-op
 * default, and `resolveFilter` turns it into "every ontology lit" using
 * the query's own data — a pure function of inputs identical on both
 * sides, with no effect and no browser read anywhere in the path. So the
 * rail and the well receive a fully-seeded no-op filter on the very first
 * render, server and client alike, and the markup matches byte for byte.
 * Nothing may ever be seeded from `localStorage`, `window` or the query
 * string. Selection, by contrast, IS server-rendered: it comes from the
 * URL (`term`), identical on both sides.
 *
 * THE SHARED HOVER CENTRE (P-D7 transient, and the bidirectional-hover
 * mechanism). The transient ego centre used to be well-LOCAL state; it is
 * lifted HERE, beside the filter, so the rail and the well write the one
 * value and both read it. Hovering (or focusing) a graph node OR a rail
 * item raises the centre; the well fades to its 1-hop neighbourhood and
 * the rail marks the matching item, in either direction. It is CLIENT-ONLY
 * and seeded `undefined` — the neutral value that produces the same markup
 * as the server's selection-only render, so it never breaks hydration
 * (the same rule the filter obeys). It is NEVER seeded from the URL,
 * `localStorage` or `window`.
 *
 * DEPTH FOR THE RAIL. The rail shows each class's superclass depth, but its
 * own fragment cannot carry `superclass` without re-emitting the shared
 * operation's query text (the relay-byte-identity contract — verified).
 * So the explorer reads the WELL's fragment (already in this operation,
 * masked from the rail) and derives the depth map with the very function
 * the well lays out by (`classDepthsByUri`), then hands it down. One
 * algorithm, two readers, zero query change.
 */
const DefinitionsExplorer = ({
  className,
  term,
}: DefinitionsExplorerProps): React.ReactElement => {
  const data = useLazyLoadQuery<DefinitionsExplorerQuery>(
    definitionsExplorerQueryNode,
    definitionsExplorerVariables(term),
  );
  const namespaces = data.ontologies.map(({ prefix, namespace }) => ({
    prefix,
    namespace,
  }));

  // The ontologies the query returned — identical on both sides, so
  // everything derived from them is too. Memoised for IDENTITY as much as
  // for cost: the well is memoised on its filter's array identities, so a
  // fresh prefixes array per render would defeat that and re-render the
  // whole graph on every keystroke.
  const prefixes = useMemo(
    () => data.ontologies.map((ontology) => ontology.prefix),
    [data.ontologies],
  );

  const { filter: contextFilter, setFilter } = useLensFilter();

  // THE EFFECTIVE FILTER. An untouched context carries no namespaces —
  // the honest reading is "no chip has been pressed, so show everything",
  // and every consumer resolves it the same way: seed from the ontologies
  // the query returned. That keeps the first render (server AND client) at
  // the no-op filter, and the chips take over the moment one is pressed.
  // The strip resolves the identical fallback over the identical data
  // (`stripSlots.tsx`), so the toolbar and the canvas never disagree.
  const filter = useMemo(
    () => resolveFilter(contextFilter, prefixes),
    [contextFilter, prefixes],
  );

  // The search box's RAW text is its own state: `filter.text` is
  // normalised (trimmed, lower-cased) for matching, and feeding that back
  // into a controlled input would eat the user's spaces and capitals as
  // they type.
  const [searchText, setSearchText] = useState("");

  // THE SHARED EGO CENTRE. Client-only, `undefined` at mount (the neutral
  // value that keeps first paint equal to the server). Both surfaces read
  // and write it: this is what makes the hover bidirectional.
  const [hoverCentre, setHoverCentre] = useState<string | undefined>(undefined);
  // Stable so the well's memo boundary can compare on `hoverCentre` alone
  // (a fresh callback each render would defeat the memo — see HierarchyWell).
  const onHoverTerm = useCallback((next: string | undefined) => {
    setHoverCentre(next);
  }, []);

  // The rail's depth map — the well's own superclass-depth measure, read
  // from the well's fragment (this operation already fetches it; the rail's
  // fragment does not, and cannot without a query change). Keyed by FULL
  // IRI, globally unique, so one flat map serves every ontology. Memoised on
  // the fragment ref, identical server and client.
  const wellData = useFragment<HierarchyWell_ontologies$key>(
    hierarchyWellFragmentNode,
    data.ontologies,
  );
  const depthByUri = useMemo(() => {
    const merged = new Map<string, number>();
    for (const ontology of wellData) {
      for (const [uri, depth] of classDepthsByUri(ontology.classes)) {
        merged.set(uri, depth);
      }
    }
    return merged;
  }, [wellData]);

  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <div className="definitions-explorer-rail">
        {/* The search box lives with the state that owns it. It starts
            empty — the no-op that keeps first client paint equal to the
            server's. */}
        <p className="definitions-explorer-search">
          <label>
            Filter terms
            <input
              onChange={(event) => {
                const raw = event.target.value;
                setSearchText(raw);
                setFilter({ ...filter, text: normalizeFilterText(raw) });
              }}
              placeholder="Search terms…"
              type="search"
              value={searchText}
            />
          </label>
        </p>
        <TermRail
          depthByUri={depthByUri}
          filter={filter}
          hoverCentre={hoverCentre}
          onHoverTerm={onHoverTerm}
          ontologies={data.ontologies}
        />
      </div>
      <HierarchyWell
        filter={filter}
        hoverCentre={hoverCentre}
        onHoverTerm={onHoverTerm}
        ontologies={data.ontologies}
        term={term}
      />
      <TermInspector
        classRef={data.ontologyClass}
        namespaces={namespaces}
        propertyRef={data.ontologyProperty}
        term={term}
      />
    </div>
  );
};

export default DefinitionsExplorer;
