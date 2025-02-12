import type React from "react";
import { useCallback, useReducer } from "react";
import Context from "./Context.js";
import "./styles.css";
import type {
  FileSelectionOptions,
  ProviderOptions,
  SearchOptions,
} from "./types.js";

type State = {
  internalSearchQuery: SearchOptions["searchQuery"];
  internalSelectedFile: FileSelectionOptions["selectedFile"];
};

type Action =
  | { type: "SEARCH"; payload: SearchOptions["searchQuery"] }
  | { type: "SELECT_FILE"; payload: FileSelectionOptions["selectedFile"] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SEARCH":
      return { ...state, internalSearchQuery: action.payload };
    case "SELECT_FILE":
      return { ...state, internalSelectedFile: action.payload };
    default:
      return state;
  }
}

const componentCssClassName = "ds file-tree";

const Provider = ({
  id,
  className,
  style,
  children,
  searchQuery = "",
  selectedFile = null,
  // Controlled props
  onSearch,
  onSelectFile,
}: ProviderOptions): React.ReactElement => {
  const [state, dispatch] = useReducer(reducer, {
    internalSearchQuery: searchQuery,
    internalSelectedFile: selectedFile,
  });

  const currentSearchQuery = onSearch ? searchQuery : state.internalSearchQuery;
  const currentSelectedFile = onSelectFile
    ? selectedFile
    : state.internalSelectedFile;

  const onSearchHandler: SearchOptions["onSearch"] = useCallback(
    (query) => {
      if (onSearch) {
        onSearch(query);
      } else {
        dispatch({ type: "SEARCH", payload: query });
      }
    },
    [onSearch]
  );

  const onSelectFileHandler: FileSelectionOptions["onSelectFile"] = useCallback(
    (node) => {
      if (onSelectFile) {
        onSelectFile(node);
      } else {
        dispatch({ type: "SELECT_FILE", payload: node });
      }
    },
    [onSelectFile]
  );

  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <Context.Provider
        value={{
          searchQuery: currentSearchQuery,
          onSearch: onSearchHandler,
          selectedFile: currentSelectedFile,
          onSelectFile: onSelectFileHandler,
        }}
      >
        {children}
      </Context.Provider>
    </div>
  );
};

export default Provider;
