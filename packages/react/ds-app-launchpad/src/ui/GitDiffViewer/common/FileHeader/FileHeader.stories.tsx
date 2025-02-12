/* @canonical/generator-canonical-ds 0.0.1 */

import type { Meta, StoryObj } from "@storybook/react";
import { diffExample } from "../../Provider.fixtures.js";
import Provider from "../../Provider.js";
import Component from "./FileHeader.js";

const meta = {
  title: "GitDiffViewer/FileHeader",
  tags: ["autodocs"],
  component: Component,
  decorators: [
    (Story) => (
      <Provider diff={diffExample} collapsed={true}>
        <Story />
      </Provider>
    ),
  ],
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;
export const Default: Story = {
  args: {
    showChangeCount: false,
    showCollapse: false,
  },
};

export const Launchpad: Story = {
  args: {
    showChangeCount: true,
    showCollapse: true,
  },
};

export const WithCustomElements: Story = {
  args: {
    leftContent: <input type="checkbox" />,
    rightContent: <button type="button">delete</button>,
  },
};
