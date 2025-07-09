/* @canonical/generator-ds 0.9.0-experimental.1 */
export * from "./hooks/index.js";
export type {
  FileNode as FileTreeFileNode,
  FileTreeData,
  FolderNode as FileTreeFolderNode,
} from "./types.js";

import { File, Folder, SearchBox, TreeView } from "./common/index.js";
import Provider from "./Provider.js";
import type { FileTreeComponent } from "./types.js";

export const FileTree = Provider as FileTreeComponent;
FileTree.SearchBox = SearchBox;
FileTree.File = File;
FileTree.TreeView = TreeView;
FileTree.Folder = Folder;
