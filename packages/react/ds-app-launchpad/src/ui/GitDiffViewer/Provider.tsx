import { useCallback, useState } from "react";
import Context from "./Context.js";
import "./styles.css";
import type { ProviderOptions } from "./types.js";

const componentCssClassName = "ds git-diff-viewer";

const Provider = ({
  id,
  className,
  style,
  children,
  ...contextOptions
}: ProviderOptions): React.ReactElement => {
  const [addCommentEnabled, setAddCommentEnabled] = useState(false);
  const [addCommentOpenLocations, setAddCommentOpenLocations] = useState<
    Set<number>
  >(new Set());

  const toggleAddCommentLocation = useCallback(
    (lineNumber: number) => {
      if (!addCommentEnabled) {
        return;
      }
      const newSet = new Set(addCommentOpenLocations);
      if (newSet.has(lineNumber)) {
        newSet.delete(lineNumber);
      } else {
        newSet.add(lineNumber);
      }
      setAddCommentOpenLocations(newSet);
    },
    [addCommentOpenLocations, addCommentEnabled],
  );

  return (
    <Context.Provider
      value={{
        ...contextOptions,
        addCommentEnabled,
        setAddCommentEnabled,
        addCommentOpenLocations,
        toggleAddCommentLocation,
      }}
    >
      <div
        id={id}
        style={style}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
      >
        {children}
      </div>
    </Context.Provider>
  );
};

export default Provider;
