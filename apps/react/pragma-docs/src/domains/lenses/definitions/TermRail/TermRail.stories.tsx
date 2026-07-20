import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, Suspense } from "react";
import { useLazyLoadQuery } from "react-relay";
import type { DefinitionsExplorerQuery } from "#relay/__generated__/DefinitionsExplorerQuery.graphql.js";
import definitionsExplorerQueryNode from "#relay/__generated__/DefinitionsExplorerQuery.graphql.js";
import { withRouter } from "../../../../../.storybook/decorators/index.js";
import { definitionsExplorerVariables } from "../definitionsQuery.js";
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
  return <TermRail ontologies={data.ontologies} />;
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
