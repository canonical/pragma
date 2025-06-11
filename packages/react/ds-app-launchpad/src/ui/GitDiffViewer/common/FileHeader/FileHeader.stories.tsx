/* @canonical/generator-canonical-ds 0.0.1 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "storybook/preview-api";
import { diffExample } from "../../fixtures.js";
import { GitDiffViewer } from "../../index.js";

const meta = {
  title: "GitDiffViewer/FileHeader",
  tags: ["autodocs"],
  component: GitDiffViewer.FileHeader,
  decorators: [
    (Story) => {
      const [collapsed, setCollapsed] = useState(false);
      return (
        <GitDiffViewer
          diff={diffExample}
          isCollapsed={collapsed}
          onCollapseToggle={setCollapsed}
        >
          <Story />
        </GitDiffViewer>
      );
    },
  ],
} satisfies Meta<typeof GitDiffViewer.FileHeader>;

export default meta;

type Story = StoryObj<typeof meta>;
export const Default: Story = {
  args: {
    showChangeCount: false,
  },
};

export const Launchpad: Story = {
  args: {
    showChangeCount: true,
  },
};

export const WithCustomElements: Story = {
  args: {
    leftContent: <input type="checkbox" />,
    rightContent: <button type="button">delete</button>,
  },
};
