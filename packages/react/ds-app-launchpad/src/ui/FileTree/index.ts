/* @canonical/generator-ds 0.9.0-experimental.1 */
export * from "./helpers/index.js";
export * from "./types.js";

import Provider from "./Provider.js";
import { FileTreeComponent } from "./types.js";
export const FileTree = Provider as FileTreeComponent;
// TODO: add file, folder and search components
// FileTree.Folder = Folder;
// ..
