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
    bordered: {
      control: { type: "boolean" },
      description: "Whether the section has a top border.",
      table: {
        type: {
          summary: "boolean",
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

export const Bordered: Story = {
  args: {
    children: <span>This section has a top border.</span>,
    bordered: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "A section can have a top border to increase its visual separation from preceding content.",
      },
    },
  },
};

export const Spacing: StoryFn<typeof Component> = (props) => (
  <>
    {SECTION_SPACING.map((spacingLevel) => (
      <Component key={spacingLevel} spacing={spacingLevel} {...props}>
        <h4>This is a {spacingLevel} section.</h4>
      </Component>
    ))}
  </>
);
Spacing.parameters = {
  docs: {
    description: {
      story:
        "Sections can have varying visual spacing levels to organize information according to an information hierarchy.<br>Use the `spacing` prop to set the desired spacing level.<br>The example below uses `spacing` with `bordered` to help visually demonstrate the different spacing levels, but `spacing` can be used without `bordered` as well.",
    },
  },
};

// Hide the spacing, border, children input controls as they are controlled by the story itself
Spacing.argTypes = {
  spacing: {
    table: {
      disable: true,
    },
  },
  bordered: {
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
  bordered: true,
};
