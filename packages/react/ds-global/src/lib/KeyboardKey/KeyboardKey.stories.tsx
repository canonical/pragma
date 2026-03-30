import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import {
  ACTION_KEYS,
  FUNCTION_KEYS,
  MODIFIER_KEYS,
  NAVIGATION_KEYS,
} from "./constants.js";
import Component from "./KeyboardKey.js";

const meta = {
  title: "Experimental/KeyboardKey",
  component: Component,
  tags: ["autodocs"],
  argTypes: {
    keyValue: { control: { type: "select" } },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    keyValue: "enter",
  },
};

export const ModifierKeys: StoryFn<typeof Component> = () => (
  <div
    style={{ display: "inline-flex", gap: "var(--spacing-horizontal-small)" }}
  >
    {(Object.keys(MODIFIER_KEYS) as Array<keyof typeof MODIFIER_KEYS>).map(
      (key) => (
        <Component key={key} keyValue={key} />
      ),
    )}
  </div>
);
ModifierKeys.args = { keyValue: "shift" };
ModifierKeys.argTypes = { keyValue: { table: { disable: true } } };

export const ActionKeys: StoryFn<typeof Component> = () => (
  <div
    style={{ display: "inline-flex", gap: "var(--spacing-horizontal-small)" }}
  >
    {(Object.keys(ACTION_KEYS) as Array<keyof typeof ACTION_KEYS>).map(
      (key) => (
        <Component key={key} keyValue={key} />
      ),
    )}
  </div>
);
ActionKeys.argTypes = { keyValue: { table: { disable: true } } };

export const NavigationKeys: StoryFn<typeof Component> = () => (
  <div
    style={{ display: "inline-flex", gap: "var(--spacing-horizontal-small)" }}
  >
    {(Object.keys(NAVIGATION_KEYS) as Array<keyof typeof NAVIGATION_KEYS>).map(
      (key) => (
        <Component key={key} keyValue={key} />
      ),
    )}
  </div>
);
NavigationKeys.argTypes = { keyValue: { table: { disable: true } } };

export const FunctionKeys: StoryFn<typeof Component> = () => (
  <div
    style={{ display: "inline-flex", gap: "var(--spacing-horizontal-small)" }}
  >
    {(Object.keys(FUNCTION_KEYS) as Array<keyof typeof FUNCTION_KEYS>).map(
      (key) => (
        <Component key={key} keyValue={key} />
      ),
    )}
  </div>
);
FunctionKeys.argTypes = { keyValue: { table: { disable: true } } };
