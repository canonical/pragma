import type { Meta, StoryObj } from "@storybook/react-vite";
import ComponentEntityPage from "./ComponentEntityPage.js";

/**
 * The full entity view under the addon's mock Relay environment
 * (`parameters.relay` — every operation resolves through the given
 * mockResolvers). The real routes feed this page live graph data; see
 * `ComponentEntityPage.tests.tsx` for the captured-fixture renders.
 */
const meta: Meta<typeof ComponentEntityPage> = {
  title: "Components/ComponentEntityPage",
  component: ComponentEntityPage,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ComponentEntityPage>;

export const Default: Story = {
  args: {
    params: { uri: "ds:global.component.button" },
  },
  parameters: {
    relay: {
      mockResolvers: {
        Component: () => ({
          name: "Button",
          uri: "ds:global.component.button",
          summary:
            "Buttons trigger actions within an interface, typically involving data transformation or manipulation.",
        }),
        Tier: () => ({ name: "Global" }),
        Property: () => ({
          name: "variantSpecial",
          propertyType: "choice",
          optional: false,
          defaultValue: "default",
        }),
      },
    },
  },
};
