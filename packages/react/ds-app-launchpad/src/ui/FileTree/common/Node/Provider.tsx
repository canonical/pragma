import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dataPathHash } from "../../Provider.js";
import { useFileTree } from "../../hooks/index.js";
import type { FileTreeData } from "../../types.js";
import { hashNodeName } from "../../utils/index.js";
import { IndentationBlock } from "../IndentationBlock/index.js";
import Context from "./Context.js";
import { useNode } from "./hooks/index.js";
import "./styles.css";
import type { ProviderProps } from "./types.js";

const componentCssClassName = "ds node";
const expandedCssClassName = "expanded";
const expandableCssClassName = "expandable";
const selectableCssClassName = "selectable";

const Provider = ({
  id,
  className,
  style,
  children,
  name,
  marker,
  ...nodeOptions
}: ProviderProps): React.ReactElement | null => {
  const {
    expandable,
    searchQuery,
    selectedFile,
    onSelectFile,
    focusNextNode,
    focusEndNode,
    focusNextSiblingCharacter,
  } = useFileTree();
  const nodeRef = useRef<FileTreeData>({
    name,
    path: "",
    type: nodeOptions.nodeType,
  });

  const { depth, path: parentPath, addChildNode } = useNode();
  const [childNodes, setChildNodes] = useState<FileTreeData[]>([]);

  const [isExpanded, setIsExpanded] = useState(
    nodeOptions.nodeType === "folder" && nodeOptions.defaultOpen,
  );
  const path = useMemo(() => `${parentPath}/${name}`, [parentPath, name]);
  const isSelected = useMemo(
    () => selectedFile?.path === path,
    [selectedFile, path],
  );

  const matchesQuery = useCallback((query: string, target: string) => {
    return target.toLowerCase().includes(query.toLowerCase());
  }, []);

  const fileMatchesSearchQuery = useCallback(
    (node: FileTreeData) => {
      if (!searchQuery) return true;
      // check if path matches in case of files
      if (node.type === "file") {
        return matchesQuery(searchQuery, node.name);
      }
      // check if any child/grandchild matches in case of folders
      return (
        matchesQuery(searchQuery, node.name) ||
        node.children?.some(fileMatchesSearchQuery)
      );
    },
    [searchQuery, matchesQuery],
  );

  const shouldHideNode = useMemo(() => {
    if (!searchQuery) return false;
    return !fileMatchesSearchQuery(nodeRef.current);
  }, [searchQuery, fileMatchesSearchQuery]);
  const handleClick: React.MouseEventHandler<HTMLLIElement> = useCallback(
    (_event) => {
      switch (nodeOptions.nodeType) {
        case "folder":
          if (expandable) {
            setIsExpanded((prev) => !prev);
          }
          break;
        case "file":
          onSelectFile?.({
            name,
            path,
            type: nodeOptions.nodeType,
          });
          break;
      }
    },
    [nodeOptions.nodeType, onSelectFile, name, path, expandable],
  );

  const handleKeyDown: React.KeyboardEventHandler<HTMLLIElement> = (event) => {
    if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey)
      return;
    if (event.key.match(/^[a-zA-Z0-9]$/)) {
      focusNextSiblingCharacter(event.key);
      event.preventDefault();
    }
    switch (event.key) {
      case "ArrowRight":
        if (!isExpanded && nodeOptions.nodeType === "folder" && expandable) {
          setIsExpanded(true);
          event.preventDefault();
        } else {
          focusNextNode("down");
          event.preventDefault();
        }
        break;
      case "ArrowLeft":
        if (isExpanded && nodeOptions.nodeType === "folder" && expandable) {
          setIsExpanded(false);
          event.preventDefault();
        } else {
          focusNextNode("up");
          event.preventDefault();
        }
        break;
      case "ArrowDown":
        focusNextNode("down");
        event.preventDefault();

        break;
      case "ArrowUp":
        focusNextNode("up");
        event.preventDefault();
        break;
      case "Home":
        focusEndNode("start");
        event.preventDefault();
        break;
      case "End":
        focusEndNode("end");
        event.preventDefault();
        break;
      case "Enter":
      case " ":
        if (nodeOptions.nodeType === "file") {
          onSelectFile?.({
            name,
            path,
            type: nodeOptions.nodeType,
          });
        }
        event.preventDefault();
        break;
    }
  };

  // update parent's childNodes with the current node object reference
  // biome-ignore lint/correctness/useExhaustiveDependencies: the nodeRef.current is updated only once
  useEffect(() => {
    if (nodeRef.current) {
      addChildNode(nodeRef.current);
    }
  }, []);

  // update the node object information when the information changes
  useEffect(() => {
    if (nodeRef.current) {
      nodeRef.current.path = path;
      if (nodeRef.current.type === "folder") {
        nodeRef.current.children = childNodes;
      }
    }
  }, [path, childNodes]);

  return (
    <Context.Provider
      value={{
        depth: depth + 1,
        path,
        addChildNode: (node) => setChildNodes((prev) => [...prev, node]),
        childNodes,
      }}
    >
      {!shouldHideNode && (
        <li
          id={id}
          style={style}
          // used by the provider to handle accessibility
          {...{
            [dataPathHash]: hashNodeName(path),
          }}
          data-name={name}
          className={[
            componentCssClassName,
            className,
            nodeOptions.nodeType,
            isExpanded && expandedCssClassName,
            nodeOptions.nodeType === "folder" &&
              expandable &&
              expandableCssClassName,
            nodeOptions.nodeType === "file" &&
              onSelectFile !== undefined &&
              selectableCssClassName,
          ]
            .filter(Boolean)
            .join(" ")}
          role="treeitem"
          aria-expanded={
            nodeOptions.nodeType === "folder" ? isExpanded : undefined
          }
          aria-selected={isSelected}
          tabIndex={-1}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          <IndentationBlock depth={depth} />
          <div
            className={[
              "icon",
              nodeOptions.nodeType,
              isExpanded && expandedCssClassName,
            ]
              .filter(Boolean)
              .join(" ")}
          />
          <span className="nodename">{name}</span>
          {marker && <div className="marker">{marker}</div>}
        </li>
      )}
      {nodeOptions.nodeType === "folder" &&
        (isExpanded || expandable === false) &&
        children}
    </Context.Provider>
  );
};

export default Provider;
