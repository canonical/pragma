/* @canonical/generator-canonical-ds 0.0.1 */

import type { Meta, StoryFn } from "@storybook/react";
import { fn } from "@storybook/test";
import * as fixtures from "../../fixtures.js";
import { GitDiffViewer } from "../../index.js";
import type { ProviderOptions } from "../../types.js";
import type { CodeDiffViewerProps } from "./types.js";

const meta: Meta = {
  title: "GitDiffViewer/CodeDiffViewer",
  tags: ["autodocs"],
  component: GitDiffViewer.CodeDiffViewer,
  argTypes: {
    diff: { table: { disable: true } },
    lineDecorations: { table: { disable: true } },
  },
};

export default meta;

const Template: StoryFn<
  CodeDiffViewerProps & Pick<ProviderOptions, "diff" | "lineDecorations">
> = ({ diff, lineDecorations, ...args }) => {
  return (
    <GitDiffViewer diff={diff} lineDecorations={lineDecorations}>
      <GitDiffViewer.CodeDiffViewer {...args} />
    </GitDiffViewer>
  );
};

const storyOptions = {
  docs: {
    source: {
      type: "code",
    },
  },
};

export const Default = Template.bind({});
Default.args = {
  diff: fixtures.diffExample,
};
Default.parameters = storyOptions;

export const WithComments = Template.bind({});
WithComments.args = {
  diff: fixtures.diffExample,
  lineDecorations: fixtures.commentExample,
};
WithComments.parameters = storyOptions;

export const InteractiveGutterWithAddComment = Template.bind({});
InteractiveGutterWithAddComment.args = {
  diff: fixtures.diffExample,
  lineDecorations: fixtures.commentExample,
  AddComment: fixtures.addCommentExample,
};

InteractiveGutterWithAddComment.parameters = storyOptions;

export const InteractiveGutterWithClickHandler = Template.bind({});
InteractiveGutterWithClickHandler.args = {
  diff: fixtures.diffExample,
  lineDecorations: fixtures.commentExample,
  onLineClick: fn(),
};

InteractiveGutterWithClickHandler.parameters = storyOptions;
