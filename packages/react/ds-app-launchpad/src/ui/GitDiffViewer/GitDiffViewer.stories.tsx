/* @canonical/generator-canonical-ds 0.0.1 */

import { useState } from "@storybook/preview-api";
import type { Meta, StoryObj } from "@storybook/react";
import {
  addCommentExample,
  addedFileDiffSample,
  commentExample,
  deletedFileDiffSample,
  diffSample,
} from "./GitDiffViewer.fixture.js";
import Component from "./GitDiffViewer.js";

const meta = {
  title: "GitDiffViewer",
  tags: ["autodocs"],
  component: Component,
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    diff: diffSample,
    children: (
      <>
        <Component.FileHeader showCollapse showChangeCount />
        <Component.CodeDiff />
      </>
    ),
    wrapLines: false,
    lineDecorations: {},
  },
  render: (args) => {
    const [collapsed, setCollapsed] = useState(false);
    return (
      <Component
        {...args}
        collapsed={collapsed}
        onCollapseToggle={setCollapsed}
      >
        {args.children}
      </Component>
    );
  },
};

export const WithComments: Story = {
  args: {
    diff: diffSample,
    wrapLines: false,
    collapsed: false,
    lineDecorations: {
      20: commentExample,
    },
    children: (
      <>
        <Component.FileHeader showChangeCount />
        <Component.CodeDiff>{addCommentExample}</Component.CodeDiff>
      </>
    ),
  },
};

export const DeletedFile: Story = {
  args: {
    diff: deletedFileDiffSample,
    wrapLines: false,
    collapsed: false,
    lineDecorations: {},
    children: (
      <>
        <Component.FileHeader showChangeCount />
        <Component.CodeDiff />
      </>
    ),
  },
};

export const AddedFile: Story = {
  args: {
    diff: addedFileDiffSample,
    wrapLines: false,
    collapsed: false,
    lineDecorations: {},
    children: (
      <>
        <Component.FileHeader showChangeCount />
        <Component.CodeDiff />
      </>
    ),
  },
};
