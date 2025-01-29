/* @canonical/generator-canonical-ds 0.0.1 */

import type { Meta, StoryObj } from "@storybook/react";
import { DiffViewerProvider } from "../DiffViewerContext/DiffViewerContext.js";
import GitDiffViewer from "../GitDiffViewer.js";
import {
  ADD_COMMENT,
  DUMMY_COMMENT,
  PARSED_SAMPLE_DIFF,
} from "../GitDiffViewer.stories.js";
import Component from "./CodeDiffViewer.js";

const meta = {
  title: "GitDiffViewer/GitDiffViewer.CodeDiff",
  tags: ["autodocs"],
  component: Component,
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <GitDiffViewer diff={PARSED_SAMPLE_DIFF}>
      <Component />
    </GitDiffViewer>
  ),
};

export const WithComments: Story = {
  render: () => (
    <DiffViewerProvider
      diff={PARSED_SAMPLE_DIFF}
      lineDecorations={{ 20: DUMMY_COMMENT }}
    >
      <Component />
    </DiffViewerProvider>
  ),
};

export const WithAddComment: Story = {
  render: () => (
    <GitDiffViewer
      diff={PARSED_SAMPLE_DIFF}
      lineDecorations={{ 20: DUMMY_COMMENT }}
    >
      <Component>{ADD_COMMENT}</Component>
    </GitDiffViewer>
  ),
};
