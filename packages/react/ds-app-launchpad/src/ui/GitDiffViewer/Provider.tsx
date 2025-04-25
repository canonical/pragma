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
  const [addCommentOpenLocations, setAddCommentOpenLocations] = useState<
    Set<number>
  >(new Set());

  const toggleAddCommentLocation = useCallback(
    (lineNumber: number) => {
      const newSet = new Set(addCommentOpenLocations);
      if (newSet.has(lineNumber)) {
        newSet.delete(lineNumber);
      } else {
        newSet.add(lineNumber);
      }
      setAddCommentOpenLocations(newSet);
    },
    [addCommentOpenLocations],
  );

  return (
    <Context.Provider
      value={{
        ...contextOptions,
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
