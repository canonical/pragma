import type { Meta, StoryFn } from "@storybook/react-vite";
import { KeyboardKey } from "../KeyboardKey/index.js";
import Component from "./KeyboardKeys.js";

const meta = {
  title: "Experimental/KeyboardKeys",
  component: Component,
  tags: ["autodocs"],
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
  <Component>
    <KeyboardKey keyValue="ctrl" />
    <span>+</span>
    <KeyboardKey keyValue="c" />
  </Component>
);
