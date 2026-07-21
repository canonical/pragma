import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, Suspense, useState } from "react";
import { useLazyLoadQuery } from "react-relay";
import type { DefinitionsExplorerQuery } from "#relay/__generated__/DefinitionsExplorerQuery.graphql.js";
import definitionsExplorerQueryNode from "#relay/__generated__/DefinitionsExplorerQuery.graphql.js";
import { withRouter } from "../../../../../.storybook/decorators/index.js";
import { definitionsExplorerVariables } from "../definitionsQuery.js";
import { allNamespacesFilter } from "../lensFilter.js";
import HierarchyWell from "./HierarchyWell.js";

const bareRoutes = {
  definitionsTerm: route({ url: "/definitions/:term", component: () => null }),
} as const;

/**
 * Story harness: the explorer query against the addon's mock environment
 * provides the plural `ontologies` fragment ref the well draws.
 */
const WellFromQuery = ({
  term,
}: {
  readonly term: string | undefined;
}): ReactElement => {
  const data = useLazyLoadQuery<DefinitionsExplorerQuery>(
    definitionsExplorerQueryNode,
    definitionsExplorerVariables(undefined),
  );
  // The unfiltered seed, exactly as the explorer builds it: every
  // ontology the query returned, lit.
  const filter = allNamespacesFilter(
    data.ontologies.map((ontology) => ontology.prefix),
  );
  // The shared ego centre lives above the well in production; the story
  // stands in for that owner so hover fades the graph here too.
  const [hoverCentre, setHoverCentre] = useState<string | undefined>(undefined);
  return (
    <div style={{ blockSize: "24rem" }}>
      <HierarchyWell
        filter={filter}
        hoverCentre={hoverCentre}
        onHoverTerm={setHoverCentre}
        ontologies={data.ontologies}
        term={term}
      />
    </div>
  );
};

const meta: Meta<typeof HierarchyWell> = {
  title: "Definitions/HierarchyWell",
  component: HierarchyWell,
  tags: ["autodocs"],
  decorators: [withRouter({ routes: bareRoutes })],
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
          superclass: null,
        }),
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof HierarchyWell>;

export const Default: Story = {
  render: () => (
    <Suspense fallback={<p>Loading…</p>}>
      <WellFromQuery term={undefined} />
    </Suspense>
  ),
};

export const SelectedTerm: Story = {
  render: () => (
    <Suspense fallback={<p>Loading…</p>}>
      <WellFromQuery term="ds:UIBlock" />
    </Suspense>
  ),
};
