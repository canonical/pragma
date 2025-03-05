/* @canonical/generator-ds 0.8.0-experimental.0 */
import type React from "react";
import { useCallback, useMemo, useState } from "react";

import EditingContext from "./Context.js";
import type { EditElementProps, EditableBlockProps } from "./types.js";

import "./styles.css";

/**
 * Component that renders toggling edit mode block
 * @returns {React.ReactElement}      - Rendered EditableBlock
 */

const EditableBlock = <T extends EditElementProps>({
  id,
  EditComponent,
  className: userClassName,
  style,
  title,
  tag: TitleTag = "h3",
}: EditableBlockProps<T>): React.ReactElement => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isFocused, setisFocused] = useState<boolean>(false);

  const toggleEditing = useCallback(() => {
    setIsEditing((editing) => !editing);
  }, []);

  const handleBlur = useCallback(() => {
    setisFocused(false);
  }, []);

  const handleKeyUp = useCallback(
    (event: React.KeyboardEvent) => {
      if ((isFocused && event.key === "Enter") || event.key === " ") {
        toggleEditing();
      }
    },
    [isFocused, toggleEditing],
  );

  const componentCssClassName = "ds editable-block";

  return (
    <EditingContext.Provider value={{ isEditing, toggleEditing }}>
      <div
        className={[componentCssClassName, userClassName]
          .filter(Boolean)
          .join(" ")}
        style={style}
        id={id}
      >
        <header>
          <TitleTag className="title">{title}</TitleTag>
          <div
            className={`icon ${isEditing ? "icon-close" : "icon-edit"}`}
            onClick={toggleEditing}
            onKeyUp={handleKeyUp}
            onKeyDown={handleKeyUp}
            onBlur={handleBlur}
            role="button"
            tabIndex={0}
          />
        </header>
        <div className="content">
          {EditComponent && (
            <EditComponent {...({ isEditing, toggleEditing } as T)} />
          )}
        </div>
      </div>
    </EditingContext.Provider>
  );
};

export default EditableBlock;
