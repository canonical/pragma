import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import {
  ACTION_KEYS,
  FUNCTION_KEYS,
  MODIFIER_KEYS,
  NAVIGATION_KEYS,
} from "./constants.js";
import Component from "./KeyboardKey.js";

const meta = {
  title: "components/KeyboardKey",
  component: Component,
  argTypes: {
    keyValue: { control: { type: "select" } },
  },
  // A KeyboardKey consumes a surface (it carries `.surface`), so it renders on
  // the NEXT layer of whatever surface it sits in. Wrap the stories in a painted
  // `.surface` — with its own background/text — so the key steps up to the
  // surface+1 ("like inputs") fill and reads correctly, as it would in an app.
  // The inner `.p` keeps the inline <kbd> keys seated on the text baseline.
  decorators: [
    (Story) => (
      <div
        className="surface"
        style={{
          background: "var(--surface-color-background)",
          color: "var(--surface-color-text)",
          padding: "var(--dimension-200)",
        }}
      >
        <p className="p">{Story()}</p>
      </div>
    ),
  ],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    keyValue: "enter",
  },
};

export const ModifierKeys: StoryFn<typeof Component> = () => (
  <div style={{ display: "inline-flex", gap: "var(--dimension-100)" }}>
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
  <div style={{ display: "inline-flex", gap: "var(--dimension-100)" }}>
    {(Object.keys(ACTION_KEYS) as Array<keyof typeof ACTION_KEYS>).map(
      (key) => (
        <Component key={key} keyValue={key} />
      ),
    )}
  </div>
);
ActionKeys.argTypes = { keyValue: { table: { disable: true } } };

export const NavigationKeys: StoryFn<typeof Component> = () => (
  <div style={{ display: "inline-flex", gap: "var(--dimension-100)" }}>
    {(Object.keys(NAVIGATION_KEYS) as Array<keyof typeof NAVIGATION_KEYS>).map(
      (key) => (
        <Component key={key} keyValue={key} />
      ),
    )}
  </div>
);
NavigationKeys.argTypes = { keyValue: { table: { disable: true } } };

export const FunctionKeys: StoryFn<typeof Component> = () => (
  <div style={{ display: "inline-flex", gap: "var(--dimension-100)" }}>
    {(Object.keys(FUNCTION_KEYS) as Array<keyof typeof FUNCTION_KEYS>).map(
      (key) => (
        <Component key={key} keyValue={key} />
      ),
    )}
  </div>
);
FunctionKeys.argTypes = { keyValue: { table: { disable: true } } };
