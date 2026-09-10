import type { Meta, StoryFn } from "@storybook/react-vite";
import Component from "./Content.js";

const meta = {
  title: "patterns/Modal/Content",
  component: Component,
  decorators: [
    // A plain div standing in for the dialog the content composes into.
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
 * Default content with text.
 */
export const Default: StoryFn = () => (
  <Component>
    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
    tempor incididunt ut labore et dolore magna aliqua.
  </Component>
);
Default.parameters = {
  docs: {
    source: {
      code: `<Modal.Content>
  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
  tempor incididunt ut labore et dolore magna aliqua.
</Modal.Content>`,
    },
  },
};
