import { Button } from "@canonical/react-ds-global";
import type { Meta, StoryFn } from "@storybook/react-vite";
import { fn } from "storybook/test";
// The parts read the panel's shared tokens (inline padding, gaps, border),
// which the panel's own stylesheet declares.
import "../../styles.css";
import Component from "./Footer.js";

const meta = {
  title: "Components/SidePanel/Footer",
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

/**
 * Actions align to the end edge. Only the confirming action is
 * `constructive`: the modifier means "this creates or confirms", so a green
 * Cancel would misread.
 */
export const Default: StoryFn = () => (
  <Component>
    <Button onClick={fn()}>Cancel</Button>
    <Button importance="primary" anticipation="constructive" onClick={fn()}>
      Subscribe
    </Button>
  </Component>
);
Default.parameters = {
  docs: {
    source: {
      code: `<SidePanel.Footer>
  <Button>Cancel</Button>
  <Button importance="primary" anticipation="constructive">
    Subscribe
  </Button>
</SidePanel.Footer>`,
    },
  },
};

/** More actions than fit on one line wrap rather than overflow. */
export const Wrapping: StoryFn = () => (
  <Component>
    <Button onClick={fn()}>Reset to defaults</Button>
    <Button onClick={fn()}>Save as draft</Button>
    <Button onClick={fn()}>Cancel</Button>
    <Button importance="primary" anticipation="constructive" onClick={fn()}>
      Save and apply
    </Button>
  </Component>
);
Wrapping.parameters = {
  docs: {
    source: {
      code: `<SidePanel.Footer>
  <Button>Reset to defaults</Button>
  <Button>Save as draft</Button>
  <Button>Cancel</Button>
  <Button importance="primary" anticipation="constructive">
    Save and apply
  </Button>
</SidePanel.Footer>`,
    },
  },
};
