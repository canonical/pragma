import type { Meta, StoryFn } from "@storybook/react-vite";
import { KeyboardKey } from "../../component/KeyboardKey/index.js";
import Component from "./KeyboardKeys.js";

const meta = {
  title: "groups/KeyboardKeys",
  component: Component,
  // The keys consume a surface, so render the group on a painted `.surface`:
  // the keys step to the surface+1 ("like inputs") fill and read correctly, as
  // they would in an app. See KeyboardKey.stories for the same rationale.
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
        {Story()}
      </div>
    ),
  ],
} satisfies Meta<typeof Component>;

export default meta;

export const Default: StoryFn<typeof Component> = () => (
  <Component>
    <KeyboardKey keyValue="up" />
    <KeyboardKey keyValue="right" />
    <KeyboardKey keyValue="down" />
    <KeyboardKey keyValue="left" />
  </Component>
);

export const ComposedCommand: StoryFn<typeof Component> = () => (
  <p className="p">
    Press
    <Component>
      <KeyboardKey keyValue="ctrl" />
      <KeyboardKey keyValue="c" />
    </Component>
    to copy.
  </p>
);
