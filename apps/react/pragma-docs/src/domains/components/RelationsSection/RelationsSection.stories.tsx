import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, Suspense } from "react";
import { useLazyLoadQuery } from "react-relay";
import type { ComponentEntityQuery } from "#relay/__generated__/ComponentEntityQuery.graphql.js";
import componentEntityQueryNode from "#relay/__generated__/ComponentEntityQuery.graphql.js";
import { RELATION_PAGE_SIZE } from "../entityQuery.js";
import RelationsSection from "./RelationsSection.js";

/**
 * Story harness: the entity query against the addon's mock environment
 * (`parameters.relay`) provides the fragment ref this section consumes.
 */
const RelationsFromQuery = (): ReactElement => {
  const data = useLazyLoadQuery<ComponentEntityQuery>(
    componentEntityQueryNode,
    { uri: "ds:global.component.button", count: RELATION_PAGE_SIZE },
  );
  return data.component ? (
    <RelationsSection component={data.component} />
  ) : (
    <p>No component.</p>
  );
};

const meta: Meta<typeof RelationsSection> = {
  title: "Components/RelationsSection",
  component: RelationsSection,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof RelationsSection>;

export const Default: Story = {
  render: () => (
    <Suspense fallback={<p>Loading…</p>}>
      <RelationsFromQuery />
    </Suspense>
  ),
  parameters: {
    relay: {
      mockResolvers: {
        Subcomponent: () => ({
          name: "Card.Content",
          uri: "ds:global.subcomponent.card-content",
        }),
        ModifierFamily: () => ({
          name: "Importance",
          uri: "ds:global.modifier_family.importance",
        }),
      },
    },
  },
};
