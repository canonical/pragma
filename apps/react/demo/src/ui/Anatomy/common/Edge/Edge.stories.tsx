/* @canonical/generator-ds 0.10.0-experimental.5 */
import type { Meta, StoryObj } from "@storybook/react";
import Edge from "./Edge.js";
import "../../styles.css";

const meta: Meta<typeof Edge> = {
  title: "Anatomy/Edge",
  component: Edge,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div className="ds anatomy">
        <div className="visualization">
          <div className="tree">
            <Story />
          </div>
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Edge>;

export const SingleEdge: Story = {
  args: {
    node: {
      invariantStyles: {
        display: "inline-flex",
        alignItems: "center",
      },
    },
    uri: "ds:Button",
    depth: 0,
    index: 0,
  },
};

export const EdgeWithRelation: Story = {
  args: {
    node: {},
    uri: "ds:Card.Header",
    relation: {
      cardinality: "0..1",
      slotName: "header",
    },
    depth: 0,
    index: 0,
  },
};

export const EdgeWithChildren: Story = {
  args: {
    node: {
      edges: [
        {
          node: {
            uri: "ds:Card.Header",
          },
          relation: {
            cardinality: "0..1",
            slotName: "header",
          },
        },
        {
          node: {
            uri: "ds:Card.Body",
          },
          relation: {
            cardinality: "1",
          },
        },
      ],
    },
    uri: "ds:Card",
    depth: 0,
    index: 0,
  },
};

export const NestedStructure: Story = {
  args: {
    node: {
      edges: [
        {
          node: {
            uri: "ds:Form.Section",
            edges: [
              {
                node: {
                  uri: "ds:Input",
                },
                relation: {
                  cardinality: "1..*",
                  slotName: "fields",
                },
              },
            ],
          },
          relation: {
            cardinality: "1..*",
            slotName: "sections",
          },
        },
      ],
    },
    uri: "ds:Form",
    depth: 0,
    index: 0,
  },
};

export const WithInvariantStyles: Story = {
  args: {
    node: {
      invariantStyles: {
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "1rem",
        backgroundColor: "#f3f4f6",
      },
    },
    uri: "ds:FlexContainer",
    depth: 0,
    index: 0,
  },
};
