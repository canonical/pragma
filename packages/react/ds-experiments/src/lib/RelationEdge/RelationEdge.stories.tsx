import type { Meta, StoryObj } from "@storybook/react-vite";
import type { SchemaGraph } from "../../graph/types.js";
import GraphCanvas from "../GraphCanvas/GraphCanvas.js";
import RelationEdge from "./RelationEdge.js";

// An edge renderer only has geometry inside a canvas, so the story shows it in
// context. This slice carries the three associative relation kinds.
const slice: SchemaGraph = {
  entities: [
    { id: "button", label: "Button", kind: "COMPONENT", tier: "GLOBAL" },
    { id: "accent", label: "color-accent", kind: "TOKEN", tier: "GLOBAL" },
    { id: "concept", label: "Component", kind: "CONCEPT" },
    { id: "folder", label: "component-folder-structure", kind: "STANDARD" },
    { id: "classname", label: "class-name-construction", kind: "STANDARD" },
  ],
  relations: [
    { id: "uses", source: "button", target: "accent", kind: "USES" },
    { id: "governs", source: "folder", target: "concept", kind: "GOVERNS" },
    { id: "refines", source: "classname", target: "folder", kind: "REFINES" },
  ],
};

const meta: Meta<typeof RelationEdge> = {
  title: "Components/RelationEdge",
  component: RelationEdge,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof RelationEdge>;

/** The `uses`, `governs`, and `refines` relations, each in its own colour. */
export const InContext: Story = {
  render: () => (
    <GraphCanvas
      entities={slice.entities}
      relations={slice.relations}
      height={360}
      showLegend={false}
    />
  ),
};
