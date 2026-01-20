/* @canonical/generator-ds 0.10.0-experimental.2 */

import { ICON_NAMES } from "@canonical/ds-assets/src/index.js";
import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import Component from "./Icon.js";

const meta = {
  title: "Q-A/Icon",
  component: Component,
  argTypes: {
    icon: {
      options: ICON_NAMES,
      control: { type: "select" },
      description: "The name of the icon to display.",
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

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: "user",
  },
};

export const AllIcons: StoryFn<typeof Component> = (props) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    }}
  >
    {Array.from(ICON_NAMES)
      .sort((a, b) => a.localeCompare(b))
      .map((iconName) => (
        <span key={iconName}>
          <Component {...props} icon={iconName} />
          &nbsp;{iconName}
        </span>
      ))}
  </div>
);

AllIcons.argTypes = {
  // Disable icon control for this story since we are displaying all icons
  icon: { table: { disable: true } },
};

export const Size: Story = {
  args: {
    icon: "link",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Icons are sized relative to the `font-size` of their container.",
      },
    },
  },
  render: (args) => (
    <div>
      <h1>
        Button&nbsp;
        <Component {...args} />
      </h1>
      <h2>
        Variants&nbsp;
        <Component {...args} />
      </h2>
      <h3>
        Positive&nbsp;
        <Component {...args} />
      </h3>
      <h4>
        Usage&nbsp;
        <Component {...args} />
      </h4>
      <h5>
        When to use&nbsp;
        <Component {...args} />
      </h5>
      <h6>
        To indicate a positive and/or prominent action&nbsp;
        <Component {...args} />
      </h6>
    </div>
  ),
};

export const Color: Story = {
  args: {
    icon: "user",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Icons inherit the color of their parent element. Set `color` on a parent element to change the icon color.",
      },
    },
  },
  render: (args) => (
    <div>
      <p style={{ color: "blue" }}>
        Blue
        <Component {...args} />
      </p>
      <p style={{ color: "red" }}>
        Red
        <Component {...args} />
      </p>
      <p style={{ color: "green" }}>
        Green
        <Component {...args} />
      </p>
    </div>
  ),
};
