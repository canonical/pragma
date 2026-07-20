import type { Meta, StoryObj } from "@storybook/react-vite";
import type { SchemaGraph } from "../../graph/types.js";
import GraphCanvas from "../GraphCanvas/GraphCanvas.js";
import SubclassEdge from "./SubclassEdge.js";

// The taxonomic "is a": two components generalising to one concept, drawn with
// the hollow generalisation arrowhead.
const slice: SchemaGraph = {
  entities: [
    { id: "button", label: "Button", kind: "COMPONENT", tier: "GLOBAL" },
    { id: "card", label: "Card", kind: "COMPONENT", tier: "GLOBAL" },
    { id: "concept", label: "Component", kind: "CONCEPT" },
  ],
  relations: [
    {
      id: "button-isa",
      source: "button",
      target: "concept",
      kind: "SUBCLASS_OF",
    },
    { id: "card-isa", source: "card", target: "concept", kind: "SUBCLASS_OF" },
  ],
};

const meta: Meta<typeof SubclassEdge> = {
  title: "Components/SubclassEdge",
  component: SubclassEdge,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SubclassEdge>;

/** `Button is a Component`, `Card is a Component` — the taxonomy backbone. */
export const InContext: Story = {
  render: () => (
    <GraphCanvas
      entities={slice.entities}
      relations={slice.relations}
      height={320}
      showLegend={false}
    />
  ),
};
