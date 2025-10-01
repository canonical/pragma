/* @canonical/generator-ds 0.10.0-experimental.4 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { expect } from "storybook/test";
import Component from "./SkipLink.js";

const MainContents = () => (
  <>
    <p>
      Click inside this example box, then press "Shift+Tab" to make the skip
      link focused and visible.
    </p>
    {/** biome-ignore lint/a11y/useValidAnchor: For testing only */}
    <a href="#">
      After skipping to main content, this should be next in focus order
    </a>
  </>
);

const meta = {
  title: "SkipLink",
  component: Component,
  parameters: {
    docs: {
      description: {
        component:
          'The `SkipLink` component provides a way for users to quickly navigate to the main content of a page. It is typically used by keyboard and screen reader users to bypass repetitive navigation links and other elements that appear at the top of the page, pursuant to <a href="https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html">WCAG 2.1 Success Criterion 2.4.1</a>.',
      },
    },
    // SkipLink is hidden by default until it is focused, so we disable the snapshot test by default. The `Focused` story, hidden from the sidebar, forces the SkipLink to visible so it can be visually tested.
    chromatic: {
      disableSnapshot: true,
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

/*
  CSF3 story
  Uses object-based story declarations with strong TS support (`Meta` and `StoryObj`).
  Uses the latest storybook format.
*/
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  decorators: [
    decorators.beforeMain({
      children: MainContents(),
    }),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "`SkipLink` should be placed near the top of your document body, before the `main` element. By default, it targets the identifier `main`.",
      },
    },
  },
};

export const CustomMainElement: Story = {
  args: {
    mainId: "my-main-element",
  },
  decorators: [
    decorators.beforeMain({ id: "my-main-element", children: MainContents() }),
  ],
  parameters: {
    docs: {
      description: {
        story:
          'If your `<main>` element\'s ID is not `"main"``, use the `mainId` prop to specify the correct ID.',
      },
    },
  },
};

export const CustomText: Story = {
  args: {
    children: "Custom skip text",
  },
  decorators: [
    decorators.beforeMain({
      children: MainContents(),
    }),
  ],
  parameters: {
    docs: {
      description: {
        story:
          'The skip link\'s contents, by default, are `"Skip to main content"`. You can customize this by passing in your own children.',
      },
    },
  },
};

export const Focused: Story = {
  args: {
    id: "skipLink",
    children: "Skip to main content",
  },
  decorators: [
    decorators.beforeMain({
      children: MainContents(),
    }),
  ],
  // SkipLink stories are not visually tested by default - this test's purpose is to show a focused SkipLink for visual coverage.
  parameters: {
    chromatic: {
      disableSnapshot: false,
    },
  },
  // Hide the story from sidebar and documentation views
  tags: ["!dev", "!autodocs"],
  // Focus the skiplink before taking a visual snapshot
  play: async ({ canvas }) => {
    const skipLink = canvas.getByText("Skip to main content");
    await expect(skipLink).toBeInTheDocument();
    skipLink.focus();
  },
};
