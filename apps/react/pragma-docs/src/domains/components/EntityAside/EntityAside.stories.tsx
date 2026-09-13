import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, Suspense } from "react";
import { useLazyLoadQuery } from "react-relay";
import type { ComponentEntityQuery } from "#relay/__generated__/ComponentEntityQuery.graphql.js";
import componentEntityQueryNode from "#relay/__generated__/ComponentEntityQuery.graphql.js";
import { RELATION_PAGE_SIZE } from "../entityQuery.js";
import EntityAside from "./EntityAside.js";

/**
 * Story harness: the entity query against the addon's mock environment
 * (`parameters.relay`) provides the fragment ref this section consumes.
 */
const AsideFromQuery = (): ReactElement => {
  const data = useLazyLoadQuery<ComponentEntityQuery>(
    componentEntityQueryNode,
    { uri: "ds:global.component.button", count: RELATION_PAGE_SIZE },
  );
  return data.component ? (
    <EntityAside component={data.component} />
  ) : (
    <p>No component.</p>
  );
};

const meta: Meta<typeof EntityAside> = {
  title: "Components/EntityAside",
  component: EntityAside,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EntityAside>;

export const Default: Story = {
  render: () => (
    <Suspense fallback={<p>Loading…</p>}>
      <AsideFromQuery />
    </Suspense>
  ),
  parameters: {
    relay: {
      mockResolvers: {
        Component: () => ({
          uri: "ds:global.component.button",
          version: "1.0.0",
        }),
        Tier: () => ({ name: "Global" }),
      },
    },
  },
};
