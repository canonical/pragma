/* @canonical/generator-ds 0.10.0-experimental.2 */

import { MODIFIER_FAMILIES } from "@canonical/ds-types";

import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import Rule from "../Rule/Rule.js";
import Component from "./Section.js";

const meta = {
  title: "Section",
  component: Component,
  argTypes: {
    className: {
      control: { type: "text" },
      description: "Additional CSS classes to apply to the section.",
    },
    children: {
      control: { type: "text" },
      description: "The content of the section.",
    },
    prominence: {
      options: MODIFIER_FAMILIES.prominence,
      control: { type: "radio" },
      description: "The visual prominence level of the section.",
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "The `<Section>` component groups related content. Sections can have varying visual prominence levels to organize information according to an information hierarchy.",
      },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: <span>Hello world!</span>,
  },
};

export const Prominence: StoryFn<typeof Component> = (args) => (
  <div>
    {MODIFIER_FAMILIES.prominence.map((prominenceLevel) => (
      <div key={prominenceLevel}>
        <Rule />
        <Component key={prominenceLevel} {...args} prominence={prominenceLevel}>
          <h4>This is a {prominenceLevel} section.</h4>
        </Component>
      </div>
    ))}
  </div>
);
Prominence.parameters = {
  docs: {
    description: {
      story:
        "Sections can have varying visual prominence levels to organize information according to an information hierarchy.",
    },
  },
};

// Hide the prominence and children input controls as they are controlled by the story itself
Prominence.argTypes = {
  prominence: {
    table: {
      disable: true,
    },
  },
  children: {
    table: {
      disable: true,
    },
  },
};
