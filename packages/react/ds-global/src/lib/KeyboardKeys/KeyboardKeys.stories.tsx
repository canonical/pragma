import type { Meta, StoryFn } from "@storybook/react-vite";
import Component from "../KeyboardKey/KeyboardKey.js";
import KeyboardKeys from "./KeyboardKeys.js";

const meta = {
  title: "Experimental/KeyboardKeys",
  component: Component,
  tags: ["autodocs"],
} satisfies Meta<typeof Component>;

export default meta;

export const Default: StoryFn<typeof Component> = () => (
  <KeyboardKeys>
    <Component keyValue="up" />
    <Component keyValue="right" />
    <Component keyValue="down" />
    <Component keyValue="left" />
  </KeyboardKeys>
);

export const ComposedCommand: StoryFn<typeof Component> = () => (
  <div>
    Press
    <KeyboardKeys>
      <Component keyValue="ctrl" />
      <Component keyValue="c" />
    </KeyboardKeys>
    to copy.
  </div>
);
