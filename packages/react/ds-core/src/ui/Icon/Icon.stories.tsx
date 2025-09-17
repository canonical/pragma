/* @canonical/generator-ds 0.10.0-experimental.2 */

import { ICON_NAMES } from "@canonical/ds-assets/src/index.js";
// Needed for function-based story, safe to remove otherwise
// import type { IconProps } from './types.js'
import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import { ICON_SIZES } from "./constants.js";
import Component from "./Icon.js";

// Needed for template-based story, safe to remove otherwise
// import type { StoryFn } from '@storybook/react'

const meta = {
  title: "Icon",
  component: Component,
  argTypes: {
    iconName: {
      options: ICON_NAMES,
      control: { type: "select" },
      description: "The name of the icon to display.",
    },
    size: {
      options: ICON_SIZES,
      control: { type: "radio" },
      description: "The size of the icon.",
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Icons are visual symbols that represent actions, objects, or concepts.",
      },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

/*
  CSF3 story
  Uses object-based story declarations with strong TS support (`Meta` and `StoryObj`).
  Uses the latest storybook format.
*/
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    iconName: "user",
  },
};

export const Size: Story = {
  args: {
    iconName: "certificate",
    size: "lg",
  },
  decorators: [
    //  TODO should the icon and adjacent text vertically align? If so, implement that
    (Story) => (
      <span>
        <Story />
        Change the size in the controls to change the icon's size.
      </span>
    ),
  ],
};

export const All: StoryFn<typeof Component> = (props) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "var(--spacing-horizontal-small",
    }}
  >
    {/* TODO It may be better to group the items by type (like "social icons", etc) */}
    {ICON_NAMES.map((iconName) => (
      <span
        style={{
          border: "1px solid var(--tmp-color-border-default)",
          padding:
            "var(--spacing-vertical-xsmall) var(--spacing-horizontal-xsmall)",
          display: "flex",
          alignItems: "center",
        }}
        key={iconName}
      >
        <Component key={iconName} {...props} iconName={iconName} />
        &nbsp;{iconName}
      </span>
    ))}
  </div>
);
