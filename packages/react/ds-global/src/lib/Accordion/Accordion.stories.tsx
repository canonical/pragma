import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import Accordion from "./Accordion.js";

const meta: Meta<typeof Accordion> = {
  title: "Components/Accordion",
  component: Accordion,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A vertically stacked content area which can be collapsed and expanded to reveal or hide its contents. Each Accordion.Item can be opened or closed independently. Implements dso:global.component.accordion.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Accordion>;

export const Default: Story = {
  render: () => {
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
      item1: true,
    });

    const handleExpandedChange = (id: string) => (expanded: boolean) => {
      setExpandedItems((prev) => ({ ...prev, [id]: expanded }));
    };

    return (
      <Accordion>
        <Accordion.Item
          heading="What is an Accordion?"
          expanded={expandedItems.item1}
          onExpandedChange={handleExpandedChange("item1")}
        >
          <p>
            An accordion is a vertically stacked set of interactive headings that
            each reveal a section of content. When used correctly, accordions help
            users browse different pieces of related content more efficiently.
          </p>
        </Accordion.Item>
        <Accordion.Item
          heading="When to use"
          expanded={expandedItems.item2}
          onExpandedChange={handleExpandedChange("item2")}
        >
          <p>
            Use accordions when you have multiple sections of content that users
            might want to compare, or when space is limited and you want to
            reduce scrolling.
          </p>
        </Accordion.Item>
        <Accordion.Item
          heading="When not to use"
          expanded={expandedItems.item3}
          onExpandedChange={handleExpandedChange("item3")}
        >
          <p>
            Avoid accordions when users need to read all the content, as they hide
            information. Also avoid when there are only one or two sections - use
            regular headings instead.
          </p>
        </Accordion.Item>
      </Accordion>
    );
  },
};

export const SingleItem: Story = {
  render: () => {
    const [expanded, setExpanded] = useState(false);

    return (
      <Accordion>
        <Accordion.Item
          heading="Click to expand"
          expanded={expanded}
          onExpandedChange={setExpanded}
        >
          <p>
            This is the content that appears when the accordion item is expanded.
            It can contain any React elements.
          </p>
        </Accordion.Item>
      </Accordion>
    );
  },
};

export const AllExpanded: Story = {
  render: () => {
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
      item1: true,
      item2: true,
      item3: true,
    });

    const handleExpandedChange = (id: string) => (expanded: boolean) => {
      setExpandedItems((prev) => ({ ...prev, [id]: expanded }));
    };

    return (
      <Accordion>
        <Accordion.Item
          heading="First Section"
          expanded={expandedItems.item1}
          onExpandedChange={handleExpandedChange("item1")}
        >
          <p>Content for the first section.</p>
        </Accordion.Item>
        <Accordion.Item
          heading="Second Section"
          expanded={expandedItems.item2}
          onExpandedChange={handleExpandedChange("item2")}
        >
          <p>Content for the second section.</p>
        </Accordion.Item>
        <Accordion.Item
          heading="Third Section"
          expanded={expandedItems.item3}
          onExpandedChange={handleExpandedChange("item3")}
        >
          <p>Content for the third section.</p>
        </Accordion.Item>
      </Accordion>
    );
  },
};

export const WithRichContent: Story = {
  render: () => {
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
      item1: true,
    });

    const handleExpandedChange = (id: string) => (expanded: boolean) => {
      setExpandedItems((prev) => ({ ...prev, [id]: expanded }));
    };

    return (
      <Accordion>
        <Accordion.Item
          heading="Rich Content Example"
          expanded={expandedItems.item1}
          onExpandedChange={handleExpandedChange("item1")}
        >
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
        </Accordion.Item>
        <Accordion.Item
          heading="Another Section"
          expanded={expandedItems.item2}
          onExpandedChange={handleExpandedChange("item2")}
        >
          <p>Simple text content is also fine.</p>
        </Accordion.Item>
      </Accordion>
    );
  },
};
