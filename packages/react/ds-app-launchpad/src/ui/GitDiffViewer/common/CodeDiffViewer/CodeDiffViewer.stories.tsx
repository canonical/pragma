/* @canonical/generator-canonical-ds 0.0.1 */

import type { Meta, StoryFn } from "@storybook/react";
import {
  addCommentExample,
  commentExample,
  diffExample,
} from "../../Provider.fixtures.js";
import Provider from "../../Provider.js";
import type { ProviderOptions } from "../../types.js";
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
  CodeDiffViewerProps & Pick<ProviderOptions, "diff" | "lineDecorations">
> = ({ diff, lineDecorations, ...args }) => {
  return (
    <Provider diff={diff} lineDecorations={lineDecorations}>
      <CodeDiffViewer {...args} />
    </Provider>
  );
};

export const Default = Template.bind({});
Default.args = {
  diff: diffExample,
};

export const WithComments = Template.bind({});
WithComments.args = {
  diff: diffExample,
  lineDecorations: { 20: commentExample },
};

export const InteractiveGutterWithAddComment = Template.bind({});
InteractiveGutterWithAddComment.args = {
  diff: diffExample,
  lineDecorations: { 20: commentExample },
  children: addCommentExample,
};
