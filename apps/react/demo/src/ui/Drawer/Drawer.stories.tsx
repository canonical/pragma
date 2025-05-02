/* @canonical/generator-ds 0.9.0-experimental.12 */

import { Button } from "@canonical/react-ds-core";
import type { Meta, StoryFn, StoryObj } from "@storybook/react";
import { useRef, useState } from "react";
import Component from "./Drawer.js";
import type { DrawerProps } from "./types.js";

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

const Example = ({
  isOpenOverride = false,
  onClose,
  children = <span>Hello world!</span>,
  ...props
}: Partial<DrawerProps>) => {
  const [isOpen, setIsOpen] = useState(isOpenOverride);
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
        {...props}
      >
        {children}
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
  <Example isOpenOverride={true} />
);

// Hide this story from the sidebar/storybook UI but keep it for visual regression testing
Open.tags = ["!dev"];

export const Overflow: StoryFn<typeof Component> = () => {
  const dialogueRef = useRef<HTMLDialogElement>(null);

  return (
    <Example
      style={{ overflow: "visible" }}
      enableOverflow={true}
      dialogueRef={dialogueRef}
    >
      <p style={{ border: "1px solid red", position: "relative", left: -200 }}>
        I am overflowing the drawer. Clicking inside this element should not
        cause the drawer to close, even if the click is outside of the contents
        bounding box.
      </p>
    </Example>
  );
};

Overflow.parameters = Default.parameters;
