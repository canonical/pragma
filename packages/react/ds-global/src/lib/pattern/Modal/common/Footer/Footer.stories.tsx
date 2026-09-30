import type { Meta, StoryFn } from "@storybook/react-vite";
import { Button } from "../../../../component/Button/index.js";
// The stand-in below is a div, not a real <Modal>, so it does not pull the
// modal's own styles — import them here to define the shared tokens.
import "../../styles.css";
import Component from "./Footer.js";

const meta = {
  title: "patterns/Modal/Footer",
  component: Component,
  decorators: [
    // A plain div standing in for the dialog the footer composes into.
    (Story) => (
      <div
        className="ds modal"
        style={{ display: "flex", flexDirection: "column" }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      // The consumer composes the sections on a `Modal`, so serve the
      // consumer-facing snippet explicitly instead of the story's own source.
      source: { type: "code", language: "tsx" },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

/**
 * Default footer with a secondary and an affirmative action.
 */
export const Default: StoryFn = () => (
  <Component>
    <Button importance="secondary">First action</Button>
    <Button importance="primary" anticipation="constructive">
      Second action
    </Button>
  </Component>
);
Default.parameters = {
  docs: {
    source: {
      code: `<Modal.Footer>
  <Button importance="secondary">First action</Button>
  <Button importance="primary" anticipation="constructive">
    Second action
  </Button>
</Modal.Footer>`,
    },
  },
};
