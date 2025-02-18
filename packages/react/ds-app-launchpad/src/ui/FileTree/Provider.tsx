import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import Context from "./Context.js";
import "./styles.css";
import type { ManagedContextOptions, ProviderOptions } from "./types.js";

const componentCssClassName = "ds file-tree";

const Provider = ({
  id,
  className,
  style,
  children,
  ...contextOptions
}: ProviderOptions): React.ReactElement => {
  // const focusedNodeRef = useRef<HTMLLIElement>(null);
  const fileTreeRef = useRef<HTMLDivElement>(null);

  const handleFocusNextNode: ManagedContextOptions["focusNextNode"] =
    useCallback((direction) => {
      if (!fileTreeRef.current) return;
      const currentNode = fileTreeRef.current.querySelector<HTMLElement>(
        "[data-path-hash]:focus",
      );
      const currentNodeHash = currentNode?.getAttribute("data-path-hash");
      if (!currentNodeHash) return;

      const nextNode =
        direction === "up"
          ? fileTreeRef.current.querySelector<HTMLElement>(
              `[data-path-hash]:has(+ [data-path-hash="${currentNodeHash}"])`,
            )
          : fileTreeRef.current.querySelector<HTMLElement>(
              `[data-path-hash="${currentNodeHash}"] + [data-path-hash]`,
            );
      if (!nextNode || !currentNode) return;
      nextNode.focus();
      currentNode.setAttribute("tabindex", "-1");
      nextNode.setAttribute("tabindex", "0");
    }, []);

  const handleFocusEndNode: ManagedContextOptions["focusEndNode"] = useCallback(
    (end) => {
      if (!fileTreeRef.current) return;
      const endNode = fileTreeRef.current.querySelector<HTMLElement>(
        `[data-path-hash]:${end === "start" ? "first" : "last"}-of-type`,
      );
      const currentNode = fileTreeRef.current.querySelector<HTMLElement>(
        "[data-path-hash]:focus",
      );
      if (!endNode || !currentNode) return;
      endNode.focus();
      currentNode.setAttribute("tabindex", "-1");
      endNode.setAttribute("tabindex", "0");
    },
    [],
  );

  const handleFocusNextSiblingCharacter: ManagedContextOptions["focusNextSiblingCharacter"] =
    useCallback((character) => {
      if (!fileTreeRef.current) return;
      const currentNode = fileTreeRef.current.querySelector<HTMLElement>(
        "[data-path-hash]:focus",
      );
      if (!currentNode) return;
      const currentNodeHash = currentNode.getAttribute("data-path-hash");
      if (!currentNodeHash) return;

      const matchingNodes = Array.from(
        fileTreeRef.current.querySelectorAll<HTMLElement>(
          `[data-name^="${character}"]`,
        ),
      );
      const currentNodeIndex = matchingNodes.findIndex(
        (node) => node === currentNode,
      );

      const nextNodeWithCharacter = matchingNodes.at(
        (currentNodeIndex + 1) % matchingNodes.length,
      );

      if (!nextNodeWithCharacter) return;
      nextNodeWithCharacter.focus();
      currentNode.setAttribute("tabindex", "-1");
      nextNodeWithCharacter.setAttribute("tabindex", "0");
    }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: on search query change, the first node may be filtered out
  useEffect(() => {
    if (!fileTreeRef.current) return;
    const nodes = Array.from(
      fileTreeRef.current.querySelectorAll<HTMLElement>(
        "[data-path-hash][tabindex='0']",
      ),
    );
    for (const node of nodes) {
      node.setAttribute("tabindex", "-1");
    }
    const firstNode = fileTreeRef.current.querySelector<HTMLElement>(
      "[data-path-hash]:not([hidden])",
    );
    firstNode?.setAttribute("tabindex", "0");
  }, [contextOptions.searchQuery, contextOptions.selectedFile]);

  return (
    <Context.Provider
      value={{
        ...contextOptions,
        expandable: contextOptions.expandable ?? false,
        focusNextNode: handleFocusNextNode,
        focusEndNode: handleFocusEndNode,
        focusNextSiblingCharacter: handleFocusNextSiblingCharacter,
      }}
    >
      <div
        id={id}
        style={style}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        ref={fileTreeRef}
      >
        {children}
      </div>
    </Context.Provider>
  );
};

export default Provider;
