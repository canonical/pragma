/* @canonical/generator-ds 0.10.0-experimental.4 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
/*
 * Replace the storybook/test import with `@storybook/test` and adjust the stories accordingly if you're not using Storybook 9.0.
 * Refer to the Storybook documentation for the correct package and imports for earlier versions.
 */
import { expect } from "storybook/test";
import Component from "./SkipLink.js";

const MainContents = () => (
  <>
    <p>
      Click inside this example box, then hit the "Tab" key to make the skip
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
    // SkipLink is hidden by default until it is focused, so we disable the snapshot test by default. The `visible` story, hidden from the sidebar, forces the SkipLink to visible so it can be visually tested.
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
        component:
          "`SkipLink` should be placed near the top of your document body. By default, it targets ",
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
};

export const Visible: Story = {
  args: {
    id: "skipLink",
    children: "Skip to main content",
  },
  parameters: {
    chromatic: {
      disableSnapshot: false,
    },
  },
  decorators: [
    decorators.beforeMain({
      children: MainContents(),
    }),
  ],
  tags: ["!dev"],
  // Focus the skiplink before taking a visual snapshot
  play: async ({ canvas }) => {
    const skipLink = canvas.getByText("Skip to main content");
    await expect(skipLink).toBeInTheDocument();
    skipLink.focus();
  },
};
