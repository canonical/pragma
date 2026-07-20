import { route } from "@canonical/router-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withRouter } from "../../../../../.storybook/decorators/index.js";
import DefinitionsPage from "./DefinitionsPage.js";

/** Name-compatible bare routes so term/instance links resolve without
 * mounting the app's real pages. */
const bareRoutes = {
  definitionsTerm: route({ url: "/definitions/:term", component: () => null }),
  componentEntity: route({ url: "/components/:uri", component: () => null }),
} as const;

/**
 * The full lens page under the addon's mock Relay environment. The real
 * routes feed this page live graph data; see the `__fixtures__` captured
 * renders in `DefinitionsPage.tests.tsx` for the fidelity tests.
 */
const meta: Meta<typeof DefinitionsPage> = {
  title: "Definitions/DefinitionsPage",
  component: DefinitionsPage,
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
        OntologyProperty: () => ({
          uri: "https://ds.canonical.com/hasSubcomponent",
          label: "hasSubcomponent",
          kind: "OBJECT",
          functional: false,
          range: "https://ds.canonical.com/Subcomponent",
          namespace: "ds",
        }),
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DefinitionsPage>;

/** The term-less explorer: honest empty inspector. */
export const Explorer: Story = {
  args: {
    params: {},
  },
};

/** A selected term: the inspector shows the mocked class record. */
export const SelectedTerm: Story = {
  args: {
    params: { term: "ds:UIBlock" },
  },
};
