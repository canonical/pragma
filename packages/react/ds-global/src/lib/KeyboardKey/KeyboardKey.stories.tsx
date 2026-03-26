import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import Component from "./KeyboardKey.js";
import type { Key } from "./types.js";

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

const MODIFIER_KEYS: Key[] = [
  "shift",
  "ctrl",
  "cmd",
  "option",
  "alt",
  "capslock",
  "meta",
];
const ACTION_KEYS: Key[] = [
  "tab",
  "space",
  "backspace",
  "delete",
  "escape",
  "enter",
];
const NAVIGATION_KEYS: Key[] = [
  "up",
  "down",
  "left",
  "right",
  "home",
  "end",
  "pageup",
  "pagedown",
];
const FUNCTION_KEYS: Key[] = [
  "f1",
  "f2",
  "f3",
  "f4",
  "f5",
  "f6",
  "f7",
  "f8",
  "f9",
  "f10",
  "f11",
  "f12",
];

export const ModifierKeys: StoryFn<typeof Component> = () => (
  <div
    style={{ display: "inline-flex", gap: "var(--spacing-horizontal-small)" }}
  >
    {MODIFIER_KEYS.map((key) => (
      <Component key={key} keyValue={key} />
    ))}
  </div>
);
ModifierKeys.args = { keyValue: "shift" };
ModifierKeys.argTypes = { keyValue: { table: { disable: true } } };

export const ActionKeys: StoryFn<typeof Component> = () => (
  <div
    style={{ display: "inline-flex", gap: "var(--spacing-horizontal-small)" }}
  >
    {ACTION_KEYS.map((key) => (
      <Component key={key} keyValue={key} />
    ))}
  </div>
);
ActionKeys.argTypes = { keyValue: { table: { disable: true } } };

export const NavigationKeys: StoryFn<typeof Component> = () => (
  <div
    style={{ display: "inline-flex", gap: "var(--spacing-horizontal-small)" }}
  >
    {NAVIGATION_KEYS.map((key) => (
      <Component key={key} keyValue={key} />
    ))}
  </div>
);
NavigationKeys.argTypes = { keyValue: { table: { disable: true } } };

export const FunctionKeys: StoryFn<typeof Component> = () => (
  <div
    style={{ display: "inline-flex", gap: "var(--spacing-horizontal-small)" }}
  >
    {FUNCTION_KEYS.map((key) => (
      <Component key={key} keyValue={key} />
    ))}
  </div>
);
FunctionKeys.argTypes = { keyValue: { table: { disable: true } } };
