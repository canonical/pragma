/* @canonical/generator-canonical-ds 0.0.1 */

import type { Meta, StoryFn } from "@storybook/react";
import GitDiffViewer from "ui/GitDiffViewer/GitDiffViewer.js";

import {
  addCommentExample,
  commentExample,
  diffSample,
} from "ui/GitDiffViewer/GitDiffViewer.fixture.js";
import type { GitDiffViewerProps } from "ui/GitDiffViewer/types.js";
import CodeDiffViewer from "./CodeDiffViewer.js";
import type { CodeDiffViewerProps } from "./types.js";

const meta: Meta = {
  title: "GitDiffViewer/CodeDiffViewer",
  tags: ["autodocs"],
  component: CodeDiffViewer,
  argTypes: {
    diff: { table: { disable: true } },
    lineDecorations: { table: { disable: true } },
  },
};

export default meta;

const Template: StoryFn<
  CodeDiffViewerProps & Pick<GitDiffViewerProps, "diff" | "lineDecorations">
> = ({ diff, lineDecorations, ...args }) => {
  return (
    <GitDiffViewer diff={diff} lineDecorations={lineDecorations}>
      <CodeDiffViewer {...args} />
    </GitDiffViewer>
  );
};

export const Default = Template.bind({});
Default.args = {
  diff: diffSample,
};

export const WithComments = Template.bind({});
WithComments.args = {
  diff: diffSample,
  lineDecorations: { 20: commentExample },
};

export const WithAddComment = Template.bind({});
WithAddComment.args = {
  diff: diffSample,
  lineDecorations: { 20: commentExample },
  children: addCommentExample,
};
