/* @canonical/generator-ds 0.10.0-experimental.2 */

import { IconName } from "@canonical/ds-assets";
import { ICON_NAMES } from "@canonical/ds-assets/src/index.js";
// Needed for function-based story, safe to remove otherwise
// import type { IconProps } from './types.js'
import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import { ICON_SIZES } from "./constants.js";
import Component from "./Icon.js";
import type { IconProps, IconSize } from "./types.js";

// Needed for template-based story, safe to remove otherwise
// import type { StoryFn } from '@storybook/react'

const meta = {
  title: "Icon",
  component: Component,
  argTypes: {
    icon: {
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
    icon: "user",
  },
};

export const Size: Story = {
  args: {
    icon: "certificate",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Icons are sized relative to the font-size of their container. Use the `size` prop to adjust the size of the icon, relative to the surrounding text.",
      },
    },
  },
  render: (args) => (
    <div>
      <h1>
        h1
        <Component {...args} />
      </h1>
      <h2>
        h2
        <Component {...args} />
      </h2>
      <h3>
        h3
        <Component {...args} />
      </h3>
      <h4>
        h4
        <Component {...args} />
      </h4>
      <h5>
        h5
        <Component {...args} />
      </h5>
      <p>
        Paragraph
        <Component {...args} />
      </p>
      <small>
        Small text
        <Component {...args} />
      </small>
    </div>
  ),
};

const IconGrid = ({ icon, ...props }: IconProps) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    }}
  >
    {ICON_NAMES.map((iconName) => (
      <span key={iconName}>
        <Component icon={iconName} {...props} />
        &nbsp;{iconName}
      </span>
    ))}
  </div>
);

export const AllIcons: StoryFn<typeof Component> = (args) => (
  <IconGrid {...args} />
);
export const AllIconsAllSizes: StoryFn<typeof Component> = (args) => (
  <div>
    {ICON_SIZES.map((size) => (
      <div key={size}>
        <h5>Size: {size}</h5>
        <IconGrid {...args} size={size} />
      </div>
    ))}
  </div>
);
// Hide from sidebar but keep in visual tests
AllIconsAllSizes.tags = ["!dev"];
