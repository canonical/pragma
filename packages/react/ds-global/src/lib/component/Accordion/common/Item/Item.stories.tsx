import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Item.js";

const meta = {
  title: "components/Accordion/Item",
  component: Component,
  argTypes: {
    heading: {
      control: { type: "text" },
      description:
        "The accordion item heading (a node — pass your own element).",
    },
    expanded: {
      control: { type: "boolean" },
      description: "Whether the accordion item is expanded (native `open`).",
    },
    children: {
      control: { type: "text" },
      description: "The content revealed when the accordion item is expanded.",
    },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    heading: "Click to expand",
    children:
      "This is the content that appears when the accordion item is expanded.",
  },
};

export const Expanded: Story = {
  args: {
    heading: "Expanded item",
    children: "This content is visible because the item is expanded.",
    expanded: true,
  },
};

export const WithRichContent: Story = {
  args: {
    heading: "Rich content example",
    expanded: true,
    children: (
      <>
        <p className="p">Accordion items can contain rich content including:</p>
        <ul>
          <li>Lists</li>
          <li>Links</li>
          <li>Other components</li>
        </ul>
        <p className="p">
          {/* biome-ignore lint/a11y/noAmbiguousAnchorText: placeholder prose demonstrating that an item accepts rich content; the rendered story is a visual baseline and its copy is deliberately unchanged. */}
          <a href="#example">Learn more</a>
        </p>
      </>
    ),
  },
};
