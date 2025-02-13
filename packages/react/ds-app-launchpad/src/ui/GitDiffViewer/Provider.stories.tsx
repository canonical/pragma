/* @canonical/generator-canonical-ds 0.0.1 */

import { useState } from "@storybook/preview-api";
import type { Meta, StoryObj } from "@storybook/react";
import * as fixtures from "./fixtures.js";
import { GitDiffViewer } from "./index.js";

const meta = {
  title: "GitDiffViewer",
  tags: ["autodocs"],
  component: GitDiffViewer,
} satisfies Meta<typeof GitDiffViewer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    diff: fixtures.diffExample,
    children: (
      <>
        <GitDiffViewer.FileHeader showCollapse showChangeCount />
        <GitDiffViewer.CodeDiffViewer />
      </>
    ),
    wrapLines: false,
    lineDecorations: {},
  },
  render: (args) => {
    const [collapsed, setCollapsed] = useState(false);
    return (
      <GitDiffViewer
        {...args}
        collapsed={collapsed}
        onCollapseToggle={setCollapsed}
      >
        {args.children}
      </GitDiffViewer>
    );
  },
};

export const WithComments: Story = {
  args: {
    diff: fixtures.diffExample,
    wrapLines: false,
    collapsed: false,
    lineDecorations: {
      20: fixtures.commentExample,
    },
    children: (
      <>
        <GitDiffViewer.FileHeader showChangeCount />
        <GitDiffViewer.CodeDiffViewer>
          {fixtures.addCommentExample}
        </GitDiffViewer.CodeDiffViewer>
      </>
    ),
  },
};

export const DeletedFile: Story = {
  args: {
    diff: fixtures.deletedFileDiffExample,
    wrapLines: false,
    collapsed: false,
    lineDecorations: {},
    children: (
      <>
        <GitDiffViewer.FileHeader showChangeCount />
        <GitDiffViewer.CodeDiffViewer />
      </>
    ),
  },
};

export const AddedFile: Story = {
  args: {
    diff: fixtures.addedFileDiffExample,
    wrapLines: false,
    collapsed: false,
    lineDecorations: {},
    children: (
      <>
        <GitDiffViewer.FileHeader showChangeCount />
        <GitDiffViewer.CodeDiffViewer />
      </>
    ),
  },
};
