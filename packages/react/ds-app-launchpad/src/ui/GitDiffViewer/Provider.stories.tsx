/* @canonical/generator-canonical-ds 0.0.1 */

import { useMemo, useState } from "@storybook/preview-api";
import type { Meta, StoryFn } from "@storybook/react";
import * as fixtures from "./fixtures.js";
import { GitDiffViewer } from "./index.js";
import type { ProviderOptions } from "./types.js";

const meta = {
  title: "GitDiffViewer",
  tags: ["autodocs"],
  component: GitDiffViewer,
  argTypes: {
    isCollapsed: {
      control: { type: "boolean", disable: true },
      description: "Whether the diff is collapsed or not",
    },
    onCollapseToggle: {
      action: "onCollapseToggle",
      description: "Callback for when the collapse state changes",
    },
  },
} satisfies Meta<typeof GitDiffViewer>;

export default meta;

const storyOptions = {
  docs: {
    source: {
      type: "code",
    },
  },
};

export const Default: StoryFn<ProviderOptions> = (args) => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <GitDiffViewer
      {...args}
      diff={fixtures.diffExample}
      isCollapsed={collapsed}
      onCollapseToggle={setCollapsed}
    >
      <GitDiffViewer.FileHeader showChangeCount />
      <GitDiffViewer.CodeDiffViewer />
    </GitDiffViewer>
  );
};

Default.parameters = storyOptions;

export const WithComments: StoryFn<ProviderOptions> = (args) => {
  const [collapsed, setCollapsed] = useState(false);
  // Consider memoizing the line decorations to avoid unnecessary re-renders
  const lineDecorations = useMemo(() => ({ 20: fixtures.commentExample }), []);

  return (
    <GitDiffViewer
      {...args}
      diff={fixtures.diffExample}
      lineDecorations={lineDecorations}
      isCollapsed={collapsed}
      onCollapseToggle={setCollapsed}
    >
      <GitDiffViewer.FileHeader showChangeCount />
      <GitDiffViewer.CodeDiffViewer />
    </GitDiffViewer>
  );
};

WithComments.parameters = storyOptions;

export const DeletedFile: StoryFn<ProviderOptions> = (args) => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <GitDiffViewer
      {...args}
      diff={fixtures.deletedFileDiffExample}
      isCollapsed={collapsed}
      onCollapseToggle={setCollapsed}
    >
      <GitDiffViewer.FileHeader showChangeCount />
      <GitDiffViewer.CodeDiffViewer />
    </GitDiffViewer>
  );
};
DeletedFile.parameters = storyOptions;

export const InteractiveGutterWithAddComment: StoryFn<ProviderOptions> = (
  args
) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <GitDiffViewer
      {...args}
      diff={fixtures.diffExample}
      isCollapsed={collapsed}
      onCollapseToggle={setCollapsed}
    >
      <GitDiffViewer.FileHeader showChangeCount />
      <GitDiffViewer.CodeDiffViewer>
        {fixtures.addCommentExample}
      </GitDiffViewer.CodeDiffViewer>
    </GitDiffViewer>
  );
};
InteractiveGutterWithAddComment.parameters = storyOptions;
