/* @canonical/generator-ds 0.9.0-experimental.1 */

import type { Meta, StoryFn } from "@storybook/react";
import { useState } from "storybook/internal/preview-api";
import { FileTree } from "./index.js";
import type { FileTreeData, ProviderOptions } from "./types.js";

const meta = {
  title: "FileTree",
  tags: ["autodocs"],
  component: FileTree,
  argTypes: {
    expandable: {
      description: "Whether the tree is expandable or not (default: `false`)",
      type: {
        name: "boolean",
        required: false,
      },
    },
    onSelectFile: {
      description: "Callback for when a file is selected",
      type: {
        name: "function",
        required: false,
      },
    },
    selectedFile: {
      description: "The selected file",
      type: {
        name: "object",
        value: {
          type: {
            required: true,
            name: "enum",
            value: ["file", "folder"],
          },
          name: {
            required: true,
            name: "string",
          },
          path: {
            required: true,
            name: "string",
          },
        },
        required: false,
      },
    },
    onSearch: {
      description: "Callback for when the search query changes",
      type: {
        name: "function",
        required: false,
      },
    },
    searchQuery: {
      description: "The search query",
      type: {
        name: "string",
        required: false,
      },
    },
  },
} satisfies Meta<typeof FileTree>;

export default meta;

const storyOptions = {
  docs: {
    source: {
      type: "code",
    },
  },
};

export const Default: StoryFn<ProviderOptions> = (args) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<FileTreeData | null>(null);
  return (
    <FileTree
      expandable
      onSearch={setSearchQuery}
      searchQuery={searchQuery}
      selectedFile={selectedNode}
      onSelectFile={setSelectedNode}
      style={{
        maxWidth: 300,
      }}
      {...args}
    >
      <FileTree.SearchBox />
      <FileTree.Folder name="test-folder" />
      <FileTree.File name="test-file" />
      <FileTree.Folder name="assets" defaultOpen>
        <FileTree.File name="logo.png" />
        <FileTree.File name="styles.css" />
        <FileTree.Folder name="images" defaultOpen>
          <FileTree.File name="image1.png" />
          <FileTree.File name="image2.png" />
          <FileTree.File name="image3.png" />
          <FileTree.File name="image4.png" />
        </FileTree.Folder>
      </FileTree.Folder>
    </FileTree>
  );
};
Default.parameters = storyOptions;

export const StaticListWithFullPaths: StoryFn<ProviderOptions> = (args) => {
  return (
    <FileTree
      {...args}
      style={{
        maxWidth: 300,
      }}
    >
      <FileTree.File name="folder-b/file-b.py" />
      <FileTree.File name="folder-b/file-c.py" />
      <FileTree.File name="folder-e/file-f/file-a.py" />
      <FileTree.File name="folder-e/file-f/file-g/file-d.py" />
    </FileTree>
  );
};
StaticListWithFullPaths.parameters = storyOptions;
