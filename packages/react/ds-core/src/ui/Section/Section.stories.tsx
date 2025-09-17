/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import Rule from "../Rule/Rule.js";
import { SECTION_SPACING } from "./constants.js";
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
    spacing: {
      options: SECTION_SPACING,
      control: { type: "radio" },
      description: "The spacing variant of the section.",
      table: {
        type: {
          summary: SECTION_SPACING.join(" | "),
        },
      },
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "The `<Section>` component groups related content. Sections can have varying visual spacing levels to organize information according to an information hierarchy.",
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

export const Spacing: StoryFn<typeof Component> = (args) => (
  <div>
    {SECTION_SPACING.map((spacingLevel) => (
      <div key={spacingLevel}>
        <Rule />
        <Component key={spacingLevel} {...args} spacing={spacingLevel}>
          <h4>This is a {spacingLevel} section.</h4>
        </Component>
      </div>
    ))}
  </div>
);
Spacing.parameters = {
  docs: {
    description: {
      story:
        "Sections can have varying visual spacing levels to organize information according to an information hierarchy.",
    },
  },
};

// Hide the spacing and children input controls as they are controlled by the story itself
Spacing.argTypes = {
  spacing: {
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
