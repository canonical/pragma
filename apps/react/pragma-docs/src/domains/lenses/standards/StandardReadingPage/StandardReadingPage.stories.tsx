import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withRouter } from "../../../../../.storybook/decorators/index.js";
import StandardReadingPage from "./StandardReadingPage.js";

/** Name-compatible bare routes so the breadcrumb and the article's
 * extends links resolve without mounting the app's real pages. */
const bareRoutes = {
  standards: route({ url: "/standards", component: () => null }),
  standardEntity: route({ url: "/standards/:uri", component: () => null }),
} as const;

/**
 * The full reading page under the addon's mock Relay environment. The
 * real route feeds this page live graph data; see the `__fixtures__`
 * captured renders in `StandardReadingPage.tests.tsx` for the fidelity
 * tests.
 */
const meta: Meta<typeof StandardReadingPage> = {
  title: "Standards/StandardReadingPage",
  component: StandardReadingPage,
  tags: ["autodocs"],
  decorators: [withRouter({ routes: bareRoutes })],
  parameters: {
    relay: {
      mockResolvers: {
        CodeStandard: () => ({
          uri: "cs:code.array.safe_access",
          name: null,
          description:
            "Use `.at(index)` instead of bracket notation for array element access.\n\nBracket notation returns `T` even though the index may be out of bounds.",
        }),
        Category: () => ({ slug: "code" }),
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof StandardReadingPage>;

/** The reading column over a mocked standard. */
export const Default: Story = {
  args: {
    params: { uri: "cs:code.array.safe_access" },
  },
};

/** The R4 in-canvas not-found: a null lookup renders an honest alert. */
export const NotFound: Story = {
  args: {
    params: { uri: "cs:no.such.standard" },
  },
  parameters: {
    relay: {
      mockResolvers: {
        Query: () => ({ codeStandard: null }),
      },
    },
  },
};
