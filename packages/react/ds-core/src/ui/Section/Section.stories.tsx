/* @canonical/generator-ds 0.10.0-experimental.2 */

import { MODIFIER_FAMILIES } from "@canonical/ds-types";
import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import type { RuleProps } from "../Rule/index.js";
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
    emphasis: {
      options: MODIFIER_FAMILIES.emphasis,
      control: { type: "radio" },
      description:
        "The emphasis variant of the section. Defines the section's starting border.",
      table: {
        type: {
          summary: MODIFIER_FAMILIES.emphasis.join(" | "),
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
export const Emphasis = (args: RuleProps) => (
  <div>
    {MODIFIER_FAMILIES.emphasis.map((emphasisLevel) => (
      <>
        <Component key={emphasisLevel} {...args} emphasis={emphasisLevel}>
          <h4>This is a {emphasisLevel} section.</h4>
        </Component>
      </>
    ))}
  </div>
);
Emphasis.parameters = {
  docs: {
    description: {
      story:
        "Different levels of visual emphasis can be applied to the section to adjust the starting border style.",
    },
  },
};

export const Spacing: StoryFn<typeof Component> = (args) => (
  <>
    {SECTION_SPACING.map((spacingLevel) => (
      <Component key={spacingLevel} {...args} spacing={spacingLevel}>
        <h4>This is a {spacingLevel} section.</h4>
      </Component>
    ))}
  </>
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

Spacing.args = {
  emphasis: "neutral",
};
