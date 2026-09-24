import type { Meta, StoryFn } from "@storybook/react-vite";
import Context from "../../Context.js";
// The stand-in below is a div, not a real <SidePanel>, so it does not pull
// the panel's own positioning — import its styles here to define the shared
// tokens and the panel's box.
import "../../styles.css";
import Component from "./Header.js";

const meta = {
  title: "Components/SidePanel/Header",
  component: Component,
  decorators: [
    (Story) => (
      <Context.Provider
        value={{ close: () => {}, titleId: "side-panel-header-story-title" }}
      >
        {/*
          A plain div standing in for the open panel: the stack layout is
          scoped to `[open]`, and the panel's fixed positioning and closed
          transform are undone, so all of it is supplied inline here.
        */}
        <div
          className="ds side-panel"
          style={{
            position: "static",
            transform: "none",
            display: "flex",
            blockSize: "24rem",
            flexDirection: "column",
            // Docked to the inline-end edge like the real panel.
            marginInlineStart: "auto",
          }}
        >
          <Story />
        </div>
      </Context.Provider>
    ),
  ],
  parameters: {
    docs: {
      // The consumer composes the sections on a `SidePanel`, so serve the
      // consumer-facing snippet explicitly instead of the story's own source.
      source: { type: "code", language: "tsx" },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

/**
 * Title at the start, close button at the end.
 *
 * The title is a `<span>`, not a heading element: headings structure the
 * page's document outline, and a panel opens from anywhere in it, so no
 * heading level would be right everywhere. The title names the panel through
 * `aria-labelledby` instead, which is what a screen reader announces when the
 * panel opens.
 */
export const Default: StoryFn = () => <Component>Ubuntu Pro</Component>;
Default.parameters = {
  docs: {
    source: {
      code: `<SidePanel.Header>Ubuntu Pro</SidePanel.Header>`,
    },
  },
};

/** A panel dismissed only from its footer omits the close button. */
export const NotDismissible: StoryFn = () => (
  <Component undismissible>Ubuntu Pro</Component>
);
NotDismissible.parameters = {
  docs: {
    source: {
      code: `<SidePanel.Header undismissible>Ubuntu Pro</SidePanel.Header>`,
    },
  },
};
