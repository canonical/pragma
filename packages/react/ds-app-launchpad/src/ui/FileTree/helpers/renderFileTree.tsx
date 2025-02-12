import type React from "react";
import type { FileTreeData } from "../types.js";

/**
 * a recursive function that renders a file tree
 *
 * @example
 * <FileTree>
 *  <FileTree.Search />
 *  {renderFileTree(nodes)}
 * </FileTree>
 */
const renderFileTree = (nodes: FileTreeData[]): React.ReactElement[] => {
  return nodes.map((node) => {
    switch (node.type) {
      case "file":
        return <div></div>;
      // return <File key={node.id} node={node} />;
      case "folder":
        return <div></div>;
      // return <Folder key={node.id} node={node} ... />;
    }
  });
};

export default renderFileTree;
