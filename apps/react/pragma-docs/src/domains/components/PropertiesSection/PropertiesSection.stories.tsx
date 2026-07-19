import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, Suspense } from "react";
import { useLazyLoadQuery } from "react-relay";
import type { ComponentEntityQuery } from "#relay/__generated__/ComponentEntityQuery.graphql.js";
import componentEntityQueryNode from "#relay/__generated__/ComponentEntityQuery.graphql.js";
import { RELATION_PAGE_SIZE } from "../entityQuery.js";
import PropertiesSection from "./PropertiesSection.js";

/**
 * Story harness: the entity query against the addon's mock environment
 * (`parameters.relay`) provides the fragment ref this section consumes.
 */
const PropertiesFromQuery = (): ReactElement => {
  const data = useLazyLoadQuery<ComponentEntityQuery>(
    componentEntityQueryNode,
    { uri: "ds:global.component.button", count: RELATION_PAGE_SIZE },
  );
  return data.component ? (
    <PropertiesSection component={data.component} />
  ) : (
    <p>No component.</p>
  );
};

const meta: Meta<typeof PropertiesSection> = {
  title: "Components/PropertiesSection",
  component: PropertiesSection,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof PropertiesSection>;

export const Default: Story = {
  render: () => (
    <Suspense fallback={<p>Loading…</p>}>
      <PropertiesFromQuery />
    </Suspense>
  ),
  parameters: {
    relay: {
      mockResolvers: {
        Property: () => ({
          name: "variantSpecial",
          propertyType: "choice",
          optional: false,
          defaultValue: "default",
          constraints: "[default, positive, negative]",
          summary: "The special variant of the button.",
        }),
      },
    },
  },
};
