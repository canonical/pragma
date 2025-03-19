/* @canonical/generator-ds 0.9.0-experimental.4 */
import type { FileTreeData } from "../../types.js";

export interface TreeViewProps {
  /**
   * The list of files and folders to display in the tree
   */
  tree: FileTreeData[];
  /**
   * Should the tree be sorted alphabetically
   *
   * @default false
   */
  sortAlphabetically?: boolean;
  /**
   * The default collapsed state of each folder in the tree
   *
   * @default false
   */
  defaultCollapsed?: boolean;
}
