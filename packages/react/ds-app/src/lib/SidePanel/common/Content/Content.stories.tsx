import type { Meta, StoryFn } from "@storybook/react-vite";
// The parts read the panel's shared tokens (inline padding, gaps, border),
// which the panel's own stylesheet declares.
import "../../styles.css";
import * as panelViewport from "../../../../storybook/sidePanel/viewport.js";
import Component from "./Content.js";

const meta = {
  title: "Components/SidePanel/Content",
  component: Component,
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

/** The panel body: prose, forms, whatever the task needs. */
export const Default: StoryFn = () => (
  <Component>
    <p>
      We deliver the world&apos;s free software, freely, to everybody on the
      same terms. Whether you are a student in India or a global bank, you can
      download and use Ubuntu free of charge.
    </p>
  </Component>
);
Default.parameters = {
  docs: {
    source: {
      code: `<SidePanel.Content>
  <p>
    We deliver the world's free software, freely, to everybody on the same
    terms. Whether you are a student in India or a global bank, you can
    download and use Ubuntu free of charge.
  </p>
</SidePanel.Content>`,
    },
  },
};
