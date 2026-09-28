import type { Meta, StoryFn } from "@storybook/react-vite";
// The parts read the panel's shared tokens (inline padding, gaps, border),
// which the panel's own stylesheet declares.
import "../../styles.css";
import Component from "./Content.js";

const meta = {
  title: "Components/SidePanel/Content",
  component: Component,
  parameters: {
    // The part alone, edge to edge: nothing in the snapshot but the part.
    layout: "fullscreen",
    // Captured at the panel's inline size (--side-panel-inline-size, 33.5rem),
    // the width that decides where the part wraps.
    chromatic: { viewports: [536] },
    docs: {
      // The consumer composes the sections on a `SidePanel`, so serve the
      // consumer-facing snippet explicitly instead of the story's own source.
      source: { type: "code", language: "tsx" },
    },
  },
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
