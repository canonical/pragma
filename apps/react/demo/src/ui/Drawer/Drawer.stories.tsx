/* @canonical/generator-ds 0.9.0-experimental.12 */

import { Button } from "@canonical/react-ds-core";
import type { Meta, StoryFn, StoryObj } from "@storybook/react";
import { useState } from "react";
import Component from "./Drawer.js";

const meta = {
  title: "Drawer",
  component: Component,
} satisfies Meta<typeof Component>;

export default meta;

/*
  CSF3 story
  Uses object-based story declarations with strong TS support (`Meta` and `StoryObj`).
  Uses the latest storybook format.
*/
type Story = StoryObj<typeof meta>;

const Example = ({ defaultIsOpen = false }: { defaultIsOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultIsOpen);
  return (
    <>
      <Button
        onClick={() => setIsOpen((curIsOpen) => !curIsOpen)}
        type="button"
      >
        Toggle Drawer
      </Button>
      <Component
        title="Drawer title"
        isOpenOverride={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <span>Hello world!</span>
      </Component>
    </>
  );
};

export const Default: StoryFn<typeof Component> = () => {
  return <Example />;
};

// The default example hides the drawer by default, so regression testing it is not helpful.
Default.parameters = {
  chromatic: {
    disable: true,
  },
};

export const Open: StoryFn<typeof Component> = () => (
  <Example defaultIsOpen={true} />
);

// Hide this story from the sidebar/storybook UI but keep it for visual regression testing
Open.tags = ["!dev"];
