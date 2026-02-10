import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import Component from "./Item.js";

const meta = {
  title: "Stable/Accordion/Item",
  component: Component,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A collapsible content area within an Accordion. Each item has a header with a chevron indicator and expandable content panel. Implements `ds:global.subcomponent.accordion-item`.",
      },
    },
  },
  argTypes: {
    heading: {
      control: { type: "text" },
      description: "The heading text displayed in the accordion item header.",
    },
    expanded: {
      control: { type: "boolean" },
      description: "Whether the accordion item is expanded.",
    },
    children: {
      control: { type: "text" },
      description: "The content revealed when the accordion item is expanded.",
    },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default collapsed accordion item.
 */
export const Default: Story = {
  args: {
    heading: "Click to expand",
    children:
      "This is the content that appears when the accordion item is expanded.",
    expanded: false,
  },
};

/**
 * Accordion item in expanded state.
 */
export const Expanded: Story = {
  args: {
    heading: "Expanded Item",
    children: "This content is visible because the item is expanded.",
    expanded: true,
  },
};

/**
 * Interactive accordion item with state management.
 */
export const Interactive: Story = {
  args: {
    heading: "Interactive Item",
    children: "Click the header to toggle this content.",
  },
  render: () => {
    const [expanded, setExpanded] = useState(false);

    return (
      <Component
        heading="Interactive Item"
        expanded={expanded}
        onExpandedChange={setExpanded}
      >
        <p>Click the header to toggle this content.</p>
        <p>Current state: {expanded ? "Expanded" : "Collapsed"}</p>
      </Component>
    );
  },
};

/**
 * Accordion item with rich content including lists and links.
 */
export const WithRichContent: Story = {
  args: {
    heading: "Rich Content Example",
    expanded: true,
    children: (
      <>
        <h4>Nested Heading</h4>
        <p>Accordion items can contain rich content including:</p>
        <ul>
          <li>Lists</li>
          <li>Links</li>
          <li>Images</li>
          <li>Other components</li>
        </ul>
        <p>
          <a href="#example">Learn more</a>
        </p>
      </>
    ),
  },
};
