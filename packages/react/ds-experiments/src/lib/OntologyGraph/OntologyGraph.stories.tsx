import type { RelayParameters } from "@canonical/storybook-addon-relay";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Suspense } from "react";
import ontologySample from "../../fixtures/ontologySample.js";
import OntologyGraph from "./OntologyGraph.js";

const meta: Meta<typeof OntologyGraph> = {
  title: "Projections/OntologyGraph",
  component: OntologyGraph,
  tags: ["autodocs"],
  // `useLazyLoadQuery` suspends while the (mocked) query is in flight, so every
  // story renders inside a Suspense boundary.
  decorators: [
    (Story) => (
      <Suspense fallback={<p>Loading ontology…</p>}>
        <Story />
      </Suspense>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof OntologyGraph>;

// `@canonical/storybook-addon-relay` reads `parameters.relay` and resolves the
// story's operation with `MockPayloadGenerator` + these resolvers. Resolving
// `SchemaGraph` explicitly makes the story deterministic for visual regression.
const fullGraphResolvers = {
  SchemaGraph: () => ({
    entities: ontologySample.entities.map((entity) => ({
      id: entity.id,
      label: entity.label,
      kind: entity.kind,
      tier: entity.tier ?? null,
      summary: entity.summary ?? null,
    })),
    relations: ontologySample.relations.map((relation) => ({
      id: relation.id,
      source: relation.source,
      target: relation.target,
      kind: relation.kind,
      label: relation.label ?? null,
    })),
  }),
};

/** The projection resolving against a mock environment: the full sample graph. */
export const Default: Story = {
  args: {
    height: 520,
  },
  parameters: {
    relay: {
      mockResolvers: fullGraphResolvers,
    } satisfies RelayParameters,
  },
};

/** The empty state: a valid response with no entities or relations. */
export const Empty: Story = {
  args: {
    height: 320,
  },
  parameters: {
    relay: {
      mockResolvers: {
        SchemaGraph: () => ({ entities: [], relations: [] }),
      },
    } satisfies RelayParameters,
  },
};
