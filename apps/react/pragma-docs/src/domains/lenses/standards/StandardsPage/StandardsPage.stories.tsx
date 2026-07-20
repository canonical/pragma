import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withRouter } from "../../../../../.storybook/decorators/index.js";
import StandardsPage from "./StandardsPage.js";

/** Name-compatible bare route so index links resolve without mounting the
 * app's real pages. */
const bareRoutes = {
  standardEntity: route({ url: "/standards/:uri", content: () => null }),
} as const;

/**
 * The full index page under the addon's mock Relay environment. The real
 * route feeds this page live graph data; see the `__fixtures__` captured
 * renders in `StandardsPage.tests.tsx` for the fidelity tests.
 */
const meta: Meta<typeof StandardsPage> = {
  title: "Standards/StandardsPage",
  component: StandardsPage,
  tags: ["autodocs"],
  decorators: [withRouter({ routes: bareRoutes })],
  parameters: {
    relay: {
      mockResolvers: {
        CodeStandard: () => ({
          uri: "cs:code.array.safe_access",
          name: null,
          description:
            "Use `.at(index)` instead of bracket notation for array element access.",
        }),
        Category: () => ({ slug: "code" }),
        PageInfo: () => ({ hasNextPage: false }),
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof StandardsPage>;

export const Default: Story = {};
