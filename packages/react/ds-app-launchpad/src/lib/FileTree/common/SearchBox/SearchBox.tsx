/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import { useCallback } from "react";
import useFileTree from "../../hooks/useFileTree.js";
import "./styles.css";
import type { SearchBoxProps } from "./types.js";

const componentCssClassName = "ds search-box";

/**
 * description of the SearchBox component
 * @returns {React.ReactElement} - Rendered SearchBox
 */
const SearchBox = ({
  id,
  className,
  style,
}: SearchBoxProps): React.ReactElement | null => {
  const { searchQuery, onSearch } = useFileTree();

  const handleSearch: React.FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      onSearch?.(formData.get("search") as string);
    },
    [onSearch],
  );
  const handleReset: React.FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      onSearch?.("");
    },
    [onSearch],
  );

  const handleInputUpdate: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        onSearch?.(event.currentTarget.value);
        event.preventDefault();
      },
      [onSearch],
    );

  if (!onSearch) {
    return null;
  }

  return (
    <form
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      onSubmit={handleSearch}
      onReset={handleReset}
    >
      <input
        value={searchQuery}
        onChange={handleInputUpdate}
        name="search"
        className="input"
        type="search"
        placeholder="Search"
        required
        autoComplete="off"
      />
      <button type="reset" className="reset">
        <span className="icon" />
      </button>
      <button type="submit" className="search">
        <span className="icon" />
      </button>
    </form>
  );
};

export default SearchBox;
