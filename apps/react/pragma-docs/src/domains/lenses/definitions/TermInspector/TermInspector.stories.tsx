import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, Suspense } from "react";
import { useLazyLoadQuery } from "react-relay";
import type { DefinitionsExplorerQuery } from "#relay/__generated__/DefinitionsExplorerQuery.graphql.js";
import definitionsExplorerQueryNode from "#relay/__generated__/DefinitionsExplorerQuery.graphql.js";
import { withRouter } from "../../../../../.storybook/decorators/index.js";
import { definitionsExplorerVariables } from "../definitionsQuery.js";
import TermInspector from "./TermInspector.js";

const bareRoutes = {
  definitionsTerm: route({ url: "/definitions/:term", component: () => null }),
  componentEntity: route({ url: "/components/:uri", component: () => null }),
} as const;

/**
 * Story harness: the explorer query against the addon's mock environment
 * provides the nullable lookup fragment refs the inspector picks from.
 */
const InspectorFromQuery = ({
  term,
}: {
  readonly term: string | undefined;
}): ReactElement => {
  const data = useLazyLoadQuery<DefinitionsExplorerQuery>(
    definitionsExplorerQueryNode,
    definitionsExplorerVariables(term),
  );
  return (
    <TermInspector
      classRef={data.ontologyClass}
      namespaces={data.ontologies.map(({ prefix, namespace }) => ({
        prefix,
        namespace,
      }))}
      propertyRef={data.ontologyProperty}
      term={term}
    />
  );
};

const meta: Meta<typeof TermInspector> = {
  title: "Definitions/TermInspector",
  component: TermInspector,
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
          definition:
            "A category of visual or abstract entity that fulfills a particular role in composing user interfaces.",
          isAbstract: true,
          namespace: "ds",
          instanceCount: 0,
          superclass: null,
        }),
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TermInspector>;

/** The honest empty state — no term selected. */
export const Empty: Story = {
  render: () => (
    <Suspense fallback={<p>Loading…</p>}>
      <InspectorFromQuery term={undefined} />
    </Suspense>
  ),
};

/** The class view over the mocked lookup. */
export const ClassTerm: Story = {
  render: () => (
    <Suspense fallback={<p>Loading…</p>}>
      <InspectorFromQuery term="ds:UIBlock" />
    </Suspense>
  ),
};
