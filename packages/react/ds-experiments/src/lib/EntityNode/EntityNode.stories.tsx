import type { Meta, StoryObj } from "@storybook/react-vite";
import { type NodeTypes, ReactFlow } from "@xyflow/react";
import type { ReactElement } from "react";
import type { GraphEntity } from "../../graph/types.js";
import EntityNode from "./EntityNode.js";
import type { EntityFlowNode } from "./types.js";
import "@xyflow/react/dist/style.css";

// A custom node only receives its handle context inside a React Flow canvas, so
// the gallery renders each entity on a small, static one-node canvas.
const nodeTypes: NodeTypes = { entity: EntityNode };

interface EntityNodePreviewProps {
  /** The entity to draw. */
  entity: GraphEntity;
  /** Render the node in its selected state. */
  selected?: boolean;
}

const EntityNodePreview = ({
  entity,
  selected,
}: EntityNodePreviewProps): ReactElement => {
  const nodes: EntityFlowNode[] = [
    {
      id: entity.id,
      type: "entity",
      position: { x: 0, y: 0 },
      data: { entity },
      selected,
    },
  ];

  return (
    <div style={{ inlineSize: 340, blockSize: 200 }}>
      <ReactFlow
        nodes={nodes}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ maxZoom: 1 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
      />
    </div>
  );
};

const meta: Meta<typeof EntityNodePreview> = {
  title: "Components/EntityNode",
  component: EntityNodePreview,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EntityNodePreview>;

export const Component: Story = {
  args: {
    entity: {
      id: "ds:global.component.button",
      label: "Button",
      kind: "COMPONENT",
      tier: "GLOBAL",
      summary: "Triggers an action within an interface.",
    },
  },
};

export const Token: Story = {
  args: {
    entity: {
      id: "ds:global.token.color-accent",
      label: "color-accent",
      kind: "TOKEN",
      tier: "GLOBAL",
      summary: "The accent colour used for emphasis and focus.",
    },
  },
};

export const Standard: Story = {
  args: {
    entity: {
      id: "ds:standard.class-name-construction",
      label: "class-name-construction",
      kind: "STANDARD",
      summary: "How component class names are assembled.",
    },
  },
};

export const Selected: Story = {
  args: {
    entity: {
      id: "ds:global.component.card",
      label: "Card",
      kind: "COMPONENT",
      tier: "GLOBAL",
      summary: "A surface that groups related content.",
    },
    selected: true,
  },
};
