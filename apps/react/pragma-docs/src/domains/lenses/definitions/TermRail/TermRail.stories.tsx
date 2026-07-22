import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, Suspense, useState } from "react";
import { useFragment, useLazyLoadQuery } from "react-relay";
import type { DefinitionsExplorerQuery } from "#relay/__generated__/DefinitionsExplorerQuery.graphql.js";
import definitionsExplorerQueryNode from "#relay/__generated__/DefinitionsExplorerQuery.graphql.js";
import type { HierarchyWell_ontologies$key } from "#relay/__generated__/HierarchyWell_ontologies.graphql.js";
import hierarchyWellFragmentNode from "#relay/__generated__/HierarchyWell_ontologies.graphql.js";
import { withRouter } from "../../../../../.storybook/decorators/index.js";
import { definitionsExplorerVariables } from "../definitionsQuery.js";
import { classDepthsByUri } from "../HierarchyWell/buildClassGraph.js";
import { allNamespacesFilter } from "../lensFilter.js";
import TermRail from "./TermRail.js";

const bareRoutes = {
  definitionsTerm: route({ url: "/definitions/:term", component: () => null }),
} as const;

/**
 * Story harness: the explorer query against the addon's mock environment
 * provides the plural `ontologies` fragment ref the rail lists.
 */
const RailFromQuery = (): ReactElement => {
  const data = useLazyLoadQuery<DefinitionsExplorerQuery>(
    definitionsExplorerQueryNode,
    definitionsExplorerVariables(undefined),
  );
  // The depth map, derived the explorer's way: from the well's fragment,
  // with the well's own depth function.
  const wellData = useFragment<HierarchyWell_ontologies$key>(
    hierarchyWellFragmentNode,
    data.ontologies,
  );
  const depthByUri = new Map<string, number>();
  for (const ontology of wellData) {
    for (const [uri, depth] of classDepthsByUri(ontology.classes)) {
      depthByUri.set(uri, depth);
    }
  }
  // The shared ego centre stands in for the explorer's lifted state.
  const [hoverCentre, setHoverCentre] = useState<string | undefined>(undefined);
  // The unfiltered seed, exactly as the explorer builds it.
  return (
    <TermRail
      depthByUri={depthByUri}
      filter={allNamespacesFilter(
        data.ontologies.map((ontology) => ontology.prefix),
      )}
      hoverCentre={hoverCentre}
      onHoverTerm={setHoverCentre}
      ontologies={data.ontologies}
    />
  );
};

const meta: Meta<typeof TermRail> = {
  title: "Definitions/TermRail",
  component: TermRail,
  tags: ["autodocs"],
  decorators: [withRouter({ routes: bareRoutes })],
};

export default meta;
type Story = StoryObj<typeof TermRail>;

export const Default: Story = {
  render: () => (
    <Suspense fallback={<p>Loading…</p>}>
      <RailFromQuery />
    </Suspense>
  ),
  parameters: {
    relay: {
      mockResolvers: {
        Ontology: () => ({
          prefix: "ds",
          label: "ds",
          namespace: "https://ds.canonical.com/",
        }),
        OntologyClass: () => ({
          uri: "https://ds.canonical.com/UIBlock",
          label: "UI Block",
          isAbstract: true,
          instanceCount: 0,
          superclass: null,
        }),
        OntologyProperty: () => ({
          uri: "https://ds.canonical.com/hasSubcomponent",
          label: "hasSubcomponent",
          kind: "OBJECT",
        }),
      },
    },
  },
};
