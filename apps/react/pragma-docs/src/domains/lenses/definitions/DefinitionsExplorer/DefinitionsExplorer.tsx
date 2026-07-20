import type React from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { DefinitionsExplorerQuery } from "#relay/__generated__/DefinitionsExplorerQuery.graphql.js";
import definitionsExplorerQueryNode from "#relay/__generated__/DefinitionsExplorerQuery.graphql.js";
import { definitionsExplorerVariables } from "../definitionsQuery.js";
import { HierarchyWell } from "../HierarchyWell/index.js";
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

  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <TermRail ontologies={data.ontologies} />
      <HierarchyWell ontologies={data.ontologies} term={term} />
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
