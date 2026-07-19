import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, Suspense } from "react";
import { useLazyLoadQuery } from "react-relay";
import type { ComponentEntityQuery } from "#relay/__generated__/ComponentEntityQuery.graphql.js";
import componentEntityQueryNode from "#relay/__generated__/ComponentEntityQuery.graphql.js";
import { RELATION_PAGE_SIZE } from "../entityQuery.js";
import EntityHeader from "./EntityHeader.js";

/**
 * Story harness: the entity query against the addon's mock environment
 * (`parameters.relay`) provides the fragment ref this section consumes.
 */
const HeaderFromQuery = (): ReactElement => {
  const data = useLazyLoadQuery<ComponentEntityQuery>(
    componentEntityQueryNode,
    { uri: "ds:global.component.button", count: RELATION_PAGE_SIZE },
  );
  return data.component ? (
    <EntityHeader component={data.component} />
  ) : (
    <p>No component.</p>
  );
};

const meta: Meta<typeof EntityHeader> = {
  title: "Components/EntityHeader",
  component: EntityHeader,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EntityHeader>;

export const Default: Story = {
  render: () => (
    <Suspense fallback={<p>Loading…</p>}>
      <HeaderFromQuery />
    </Suspense>
  ),
  parameters: {
    relay: {
      mockResolvers: {
        Component: () => ({
          name: "Button",
          uri: "ds:global.component.button",
          summary: "Buttons trigger actions within an interface.",
        }),
        Tier: () => ({ name: "Global" }),
      },
    },
  },
};
