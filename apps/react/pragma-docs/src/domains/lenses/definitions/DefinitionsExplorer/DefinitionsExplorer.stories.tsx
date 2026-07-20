import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withRouter } from "../../../../../.storybook/decorators/index.js";
import DefinitionsExplorer from "./DefinitionsExplorer.js";

const bareRoutes = {
  definitionsTerm: route({ url: "/definitions/:term", component: () => null }),
  componentEntity: route({ url: "/components/:uri", component: () => null }),
} as const;

/**
 * The triptych under the addon's mock Relay environment (the explorer
 * owns the one route query, so it needs no story harness — it IS the
 * query component). Suspense rides the page in production; here the mock
 * environment resolves synchronously.
 */
const meta: Meta<typeof DefinitionsExplorer> = {
  title: "Definitions/DefinitionsExplorer",
  component: DefinitionsExplorer,
  tags: ["autodocs"],
  decorators: [withRouter({ routes: bareRoutes })],
  parameters: {
    relay: {
      mockResolvers: {
        Ontology: () => ({
          prefix: "ds",
          label: "ds",
          namespace: "https://ds.canonical.com/",
        }),
        OntologyClass: () => ({
          uri: "https://ds.canonical.com/UIBlock",
          label: "UI Block",
          definition:
            "A category of visual or abstract entity that fulfills a particular role in composing user interfaces.",
          isAbstract: true,
          namespace: "ds",
          instanceCount: 0,
          superclass: null,
        }),
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DefinitionsExplorer>;

export const Explorer: Story = {
  args: {
    term: undefined,
  },
};

export const SelectedTerm: Story = {
  args: {
    term: "ds:UIBlock",
  },
};
