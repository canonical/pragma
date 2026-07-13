import type { Meta, StoryObj } from "@storybook/react-vite";
import ontologySample from "../../fixtures/ontologySample.js";
import GraphCanvas from "./GraphCanvas.js";

const meta: Meta<typeof GraphCanvas> = {
  title: "Components/GraphCanvas",
  component: GraphCanvas,
  tags: ["autodocs"],
  args: {
    entities: ontologySample.entities,
    relations: ontologySample.relations,
    height: 520,
  },
};

export default meta;
type Story = StoryObj<typeof GraphCanvas>;

/** The full sample ontology: every entity kind and every relation kind. */
export const Default: Story = {};

/** The canvas without its legend panel — e.g. when embedded beside one. */
export const WithoutLegend: Story = {
  args: {
    showLegend: false,
  },
};

/** Just the graph: no legend, controls, or background chrome. */
export const Minimal: Story = {
  args: {
    showLegend: false,
    showControls: false,
    showBackground: false,
  },
};

/** Only the taxonomy — the `SUBCLASS_OF` backbone of the ontology. */
export const TaxonomyOnly: Story = {
  args: {
    relations: ontologySample.relations.filter(
      (relation) => relation.kind === "SUBCLASS_OF",
    ),
  },
};
