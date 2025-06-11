/* @canonical/generator-ds 0.9.0-experimental.4 */

// Needed for function-based story, safe to remove otherwise
// import type { TreeViewProps } from './types.js'
import type { Meta, StoryFn } from "@storybook/react-vite";
import { useState } from "storybook/internal/preview-api";
import { FileTree, type FileTreeData } from "../../index.js";
import type { TreeViewProps } from "./types.js";
// Needed for template-based story, safe to remove otherwise
// import type { StoryFn } from '@storybook/react-vite'

const meta = {
  title: "FileTree/TreeView",
  tags: ["autodocs"],
  component: FileTree.TreeView,
} satisfies Meta<typeof FileTree.TreeView>;

export default meta;

const storyOptions = {
  docs: {
    source: {
      type: "code",
    },
  },
};

const tree: FileTreeData[] = [
  {
    type: "folder",
    name: "public",
    children: [
      { type: "file", name: "index.html" },
      { type: "file", name: "robots.txt" },
      { type: "file", name: "favicon.ico" },
      { type: "file", name: "manifest.json" },
      { type: "file", name: "service-worker.js" },
    ],
  },
  {
    type: "file",
    name: "package.json",
  },
  {
    type: "folder",
    name: "assets",
    children: [
      { type: "file", name: "image3.png", marker: <span>🔥</span> },
      { type: "file", name: "image4.png" },
      { type: "file", name: "image1.png" },
      { type: "file", name: "audio.mp3" },
      { type: "file", name: "image2.png" },
      { type: "file", name: "image5.png" },
    ],
  },
];

export const Default: StoryFn<TreeViewProps> = (args) => {
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
    >
      <FileTree.SearchBox />
      <FileTree.TreeView {...args} tree={tree} />
    </FileTree>
  );
};
Default.parameters = storyOptions;

export const SortedTree: StoryFn<TreeViewProps> = (args) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<FileTreeData | null>(null);
  return (
    <FileTree
      onSearch={setSearchQuery}
      searchQuery={searchQuery}
      selectedFile={selectedNode}
      onSelectFile={setSelectedNode}
      style={{
        maxWidth: 300,
      }}
    >
      <FileTree.SearchBox />
      <FileTree.TreeView {...args} tree={tree} sortAlphabetically />
    </FileTree>
  );
};

SortedTree.parameters = storyOptions;
