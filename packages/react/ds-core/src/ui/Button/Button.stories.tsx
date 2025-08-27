import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import Component from "./Button.js";
import Button from "./Button.js";

const meta = {
  title: "Button",
  component: Component,
  tags: ["autodocs"],
  // if using enum for appearance, you can use the following to generate controls
  // argTypes: {
  //   appearance: {
  //      control: 'select',
  //      mapping: ButtonAppearance,
  //      options: Object.keys(ButtonAppearance),
  //   }
  // },
  args: { onClick: fn() }, // allows the onClick function to be spyed on
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A default button can be used to indicate a positive action that isn't necessarily the main call-to-action.
 */
export const Default: Story = {
  args: {
    children: "Contact us",
    disabled: true,
  },
};

/**
 * A positive button can be used to indicate a positive action that is the main call-to-action.
 */
export const Positive: Story = {
  args: {
    children: "Confirm",
    appearance: "positive",
  },
};

/**
 * A negative button can be used to indicate a negative action that is destructive or permanent.
 */
export const Negative: Story = {
  args: {
    children: "Delete",
    appearance: "negative",
  },
};

/**
 * Custom button props can be passed to the button component.
 */
export const Custom: Story = {
  args: {
    children: <span>Customize</span>,
    "aria-label": "Customize",
    className: "custom-class",
    style: {
      "--button-color-background": "lightblue",
      "--button-color-text": "midnightblue",
      "--button-color-border": "midnightblue",
      "--button-color-background-hover": "lightskyblue",
      "--button-color-background-active": "skyblue",
    } as React.CSSProperties,
  },
};

/**
 * Intent variables are inherited with CSS, so will be applied to all child elements. For example, if there is a "positive" notification, the child buttons without "intent" will also be positive.
 * For the child element to have a different intent, the intent class name should be explicitly added.
 */
export const IntentsInheritance: Story = {
  decorators: [
    (_Story) => (
      <div
        className="positive"
        style={{
          border: "2px solid var(--intent-color)",
          padding: "1rem",
        }}
      >
        <p>
          I'm a wrapper with <code>positive</code> intent class name.
        </p>
        <Button>This is a default button</Button>
        <Button appearance="negative">This is a negative button</Button>
        <Button>This button inherits the intent from parent</Button>
      </div>
    ),
  ],
  args: {
    children: "Broken",
  },
};
