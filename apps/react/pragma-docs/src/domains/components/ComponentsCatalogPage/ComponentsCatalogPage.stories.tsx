import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withRouter } from "../../../../.storybook/decorators/index.js";
import ComponentsCatalogPage from "./ComponentsCatalogPage.js";

/** Name-compatible bare route so card links resolve without mounting the
 * app's real pages. */
const bareRoutes = {
  componentEntity: route({ url: "/components/:uri", component: () => null }),
} as const;

/**
 * The whole catalog under the addon's mock Relay environment
 * (`parameters.relay`). The real route feeds this page the live graph;
 * see `ComponentsCatalogPage.tests.tsx` for the captured-fixture renders.
 */
const meta: Meta<typeof ComponentsCatalogPage> = {
  title: "Components/ComponentsCatalogPage",
  component: ComponentsCatalogPage,
  tags: ["autodocs"],
  decorators: [withRouter({ routes: bareRoutes })],
};

export default meta;
type Story = StoryObj<typeof ComponentsCatalogPage>;

export const Default: Story = {
  parameters: {
    relay: {
      mockResolvers: {
        Component: () => ({
          name: "Button",
          uri: "ds:global.component.button",
          summary: "Buttons trigger actions within an interface.",
        }),
        Tier: () => ({ name: "Global" }),
        PageInfo: () => ({ hasNextPage: false }),
      },
    },
  },
};
