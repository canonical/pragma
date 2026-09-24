import { Button } from "@canonical/react-ds-global";
import type { Meta, StoryFn } from "@storybook/react-vite";
import { fn } from "storybook/test";
// The stand-in below is a div, not a real <SidePanel>, so it does not pull
// the panel's own positioning — import its styles here to define the shared
// tokens and the panel's box.
import "../../styles.css";
import Component from "./Footer.js";

const meta = {
  title: "Components/SidePanel/Footer",
  component: Component,
  decorators: [
    (Story) => (
      /*
        A plain div standing in for the open panel: the stack layout is
        scoped to `[open]`, and the panel's fixed positioning and closed
        transform are undone, so all of it is supplied inline here. The
        panel's width is what insets the footer's hairline, so the stand-in
        keeps it.
      */
      <div
        className="ds side-panel"
        style={{
          position: "static",
          transform: "none",
          display: "flex",
          flexDirection: "column",
          // Docked to the inline-end edge like the real panel.
          marginInlineStart: "auto",
        }}
      >
        <Story />
      </div>
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
