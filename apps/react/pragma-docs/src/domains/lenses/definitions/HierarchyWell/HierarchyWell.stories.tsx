import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, Suspense } from "react";
import { useLazyLoadQuery } from "react-relay";
import type { DefinitionsExplorerQuery } from "#relay/__generated__/DefinitionsExplorerQuery.graphql.js";
import definitionsExplorerQueryNode from "#relay/__generated__/DefinitionsExplorerQuery.graphql.js";
import { withRouter } from "../../../../../.storybook/decorators/index.js";
import { definitionsExplorerVariables } from "../definitionsQuery.js";
import HierarchyWell from "./HierarchyWell.js";

const bareRoutes = {
  definitionsTerm: route({ url: "/definitions/:term", content: () => null }),
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
  return (
    <div style={{ blockSize: "24rem" }}>
      <HierarchyWell ontologies={data.ontologies} term={term} />
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
