/* @canonical/generator-ds 0.9.0-experimental.1 */
import type React from "react";

export type BaseNode = {
  id: string;
  name: string;
  metadata?: Record<string, unknown>;
};

export type FileNode = BaseNode & {
  type: "file";
};

export type FolderNode = BaseNode & {
  type: "folder";
  children?: Array<FileTreeData>;
};

export type FileTreeData = FolderNode | FileNode;

export type SearchOptions = {
  /**
   * Files and folders to display if matching the search query.
   */
  searchQuery: string;
  /**
   * Callback to update the search query.
   */
  onSearch: (query: string) => void;
};

export type FileSelectionOptions = {
  /**
   * The currently selected file item.
   */
  selectedFile: FileNode | null;
  /**
   * Callback to select a file item.
   */
  onSelectFile: (node: FileNode) => void;
};

export type ContextOptions = FileSelectionOptions & SearchOptions;

export type ProviderOptions = {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Consider using `FileTree.Folder` and `FileTree.File` components to build the file tree.
   */
  children?: React.ReactNode;
} & Partial<SearchOptions> &
  Partial<FileSelectionOptions>;

export type FileTreeComponent = (
  props: ProviderOptions
) => React.ReactElement & {
  // TODO: add file, folder and search components
};
