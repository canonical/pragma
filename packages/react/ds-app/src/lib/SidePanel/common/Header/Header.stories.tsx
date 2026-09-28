import type { Meta, StoryFn } from "@storybook/react-vite";
import Context from "../../Context.js";
// The parts read the panel's shared tokens (inline padding, gaps, border),
// which the panel's own stylesheet declares.
import "../../styles.css";
import * as panelViewport from "../../../../storybook/sidePanel/viewport.js";
import Component from "./Header.js";

const meta = {
  title: "Components/SidePanel/Header",
  component: Component,
  decorators: [
    // Data, not markup: the header reads its close action and title id from
    // the panel's context, and without one it renders no close button.
    (Story) => (
      <Context.Provider
        value={{ close: () => {}, titleId: "side-panel-header-story-title" }}
      >
        <Story />
      </Context.Provider>
    ),
  ],
  parameters: {
    // The part alone, edge to edge: nothing in the snapshot but the part.
    layout: "fullscreen",
    // Shown and captured at the panel's width, which decides where it wraps.
    ...panelViewport.parameters,
    docs: {
      // The consumer composes the sections on a `SidePanel`, so serve the
      // consumer-facing snippet explicitly instead of the story's own source.
      source: { type: "code", language: "tsx" },
    },
  },
  globals: panelViewport.globals,
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

/** Passing the prop undismissible to the header removes the close button from the header. */
export const UnDismissible: StoryFn = () => (
  <Component undismissible>Ubuntu Pro</Component>
);
UnDismissible.parameters = {
  docs: {
    source: {
      code: `<SidePanel.Header undismissible>Ubuntu Pro</SidePanel.Header>`,
    },
  },
};
