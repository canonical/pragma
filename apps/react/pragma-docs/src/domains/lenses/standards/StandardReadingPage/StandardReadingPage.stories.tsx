import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withRouter } from "../../../../../.storybook/decorators/index.js";
import StandardReadingPage from "./StandardReadingPage.js";

/** The absolute IRI the story addresses — `node(id:)` takes nothing else. */
const STANDARD_IRI =
  "http://pragma.canonical.com/codestandards#code.array.safe_access";

/** Name-compatible bare routes so the breadcrumb resolves without
 * mounting the app's real pages. */
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
        // One `OntologyClass` mock serves BOTH `boundClass` and the node's
        // `_meta.type`, so the class guard sees matching IRIs and the
        // article renders — which is exactly the production condition.
        OntologyClass: () => ({
          uri: "http://pragma.canonical.com/codestandards#CodeStandard",
        }),
        EntityMeta: () => ({
          curie: "cs:code.array.safe_access",
          title: "code.array.safe_access",
          definition:
            "Use `.at(index)` instead of bracket notation for array element access.\n\nBracket notation returns `T` even though the index may be out of bounds.",
        }),
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof StandardReadingPage>;

/** The reading column over a mocked standard. */
export const Default: Story = {
  args: {
    params: { uri: STANDARD_IRI },
  },
};

/** The R4 in-canvas not-found: a null lookup renders an honest alert. */
export const NotFound: Story = {
  args: {
    params: {
      uri: "http://pragma.canonical.com/codestandards#no.such.standard",
    },
  },
  parameters: {
    relay: {
      mockResolvers: {
        Query: () => ({ node: null }),
      },
    },
  },
};
