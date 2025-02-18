/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import { useCallback, useId, useMemo } from "react";
import type { FileTreeData } from "../../index.js";
import File from "../File/File.js";
import Folder from "../Folder/Folder.js";
import type { TreeViewProps } from "./types.js";

/**
 * Render a tree view of the given file tree data
 *
 * @example
 * <FileTree>
 *  <FileTree.SearchBox />
 *  <FileTree.TreeView tree={treeData} />
 * </FileTree>
 *
 * @returns {React.ReactElement} - Rendered TreeView
 */
const TreeView = ({
  tree,
  sortAlphabetically,
  defaultCollapsed = false,
}: TreeViewProps): React.ReactElement => {
  const uid = useId();

  const renderNode = useCallback(
    (node: FileTreeData, basePath = "") => {
      const path = `${basePath}/${node.name}`;
      switch (node.type) {
        case "folder":
          return (
            <Folder
              key={`${uid}-${path}`}
              name={node.name}
              defaultOpen={!defaultCollapsed}
            >
              {node.children?.map((child) => renderNode(child, path))}
            </Folder>
          );
        case "file":
          return <File key={`${uid}-${path}`} name={node.name} />;
      }
    },
    [defaultCollapsed, uid],
  );
  const sortedTree = useCallback((tree: FileTreeData[]): FileTreeData[] => {
    return [...tree]
      .sort((a, b) => {
        // folders first
        if (a.type === "folder" && b.type === "file") {
          return -1;
        }
        if (a.type === "file" && b.type === "folder") {
          return 1;
        }
        // sort alphabetically
        return a.name.localeCompare(b.name);
      })
      .map((node) => {
        if (node.type === "folder" && node.children) {
          // sort recursively folder children
          return {
            ...node,
            children: sortedTree(node.children),
          };
        }
        return node;
      });
  }, []);

  const treeNode = useMemo(() => {
    if (sortAlphabetically) {
      return sortedTree(tree).map((node) => renderNode(node));
    }
    return tree.map((node) => renderNode(node));
  }, [tree, sortAlphabetically, renderNode, sortedTree]);
  return <>{treeNode}</>;
};

export default TreeView;
