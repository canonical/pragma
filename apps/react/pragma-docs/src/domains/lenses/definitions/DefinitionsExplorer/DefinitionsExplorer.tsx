import type React from "react";
import { useMemo, useState } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { DefinitionsExplorerQuery } from "#relay/__generated__/DefinitionsExplorerQuery.graphql.js";
import definitionsExplorerQueryNode from "#relay/__generated__/DefinitionsExplorerQuery.graphql.js";
import { definitionsExplorerVariables } from "../definitionsQuery.js";
import { HierarchyWell } from "../HierarchyWell/index.js";
import { allNamespacesFilter, normalizeFilterText } from "../lensFilter.js";
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
 * This component owns the lens's EPHEMERAL filter state, lifted out of the
 * rail so all three consumers read ONE value — the rail (which dims on
 * it), the well (which hides on it) and, once the strip claims its
 * sockets, the chips. Plain lifted state and props, not context: the data
 * flow stays visible, and a provider whose only subscriber is one toolbar
 * would be ceremony.
 *
 * THE SSR DETERMINISM RULE. The filter's initial value is a NO-OP by
 * construction: `allNamespacesFilter` lights every prefix the query just
 * returned, both abstractions are allowed, and the text is empty — so the
 * first client render produces markup byte-identical to the server's.
 * Nothing here may ever be seeded from `localStorage`, `window` or the
 * query string. Selection, by contrast, IS server-rendered: it comes from
 * the URL (`term`), which is identical on both sides.
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

  // The seed: every ontology the query returned, lit. Derived from data
  // identical on both sides, so it is a pure function of the render's
  // inputs — never an effect, never a browser read.
  const prefixes = useMemo(
    () => data.ontologies.map((ontology) => ontology.prefix),
    [data.ontologies],
  );
  const [filter, setFilter] = useState(() => allNamespacesFilter(prefixes));
  // The search box's RAW text is its own state: `filter.text` is
  // normalised (trimmed, lower-cased) for matching, and feeding that back
  // into a controlled input would eat the user's spaces and capitals as
  // they type.
  const [searchText, setSearchText] = useState("");

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
                setFilter((current) => ({
                  ...current,
                  text: normalizeFilterText(raw),
                }));
              }}
              placeholder="Search terms…"
              type="search"
              value={searchText}
            />
          </label>
        </p>
        <TermRail filter={filter} ontologies={data.ontologies} />
      </div>
      <HierarchyWell filter={filter} ontologies={data.ontologies} term={term} />
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
