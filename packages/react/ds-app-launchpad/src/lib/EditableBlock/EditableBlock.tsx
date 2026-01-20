/* @canonical/generator-ds 0.8.0-experimental.0 */
import type React from "react";
import { useCallback, useRef, useState } from "react";

import EditingContext from "./Context.js";
import type { EditableBlockProps, EditElementProps } from "./types.js";

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
  isReadOnly = false,
}: EditableBlockProps<T>): React.ReactElement => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const isFocusedRef = useRef<boolean>(false);

  const toggleEditing = useCallback(() => {
    if (isReadOnly) return;
    setIsEditing((editing) => !editing);
  }, [isReadOnly]);

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false;
  }, []);

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true;
  }, []);

  const handleKeyUp = useCallback(
    (event: React.KeyboardEvent) => {
      if (
        (isFocusedRef.current && event.key === "Enter") ||
        event.key === " "
      ) {
        toggleEditing();
      }
    },
    [toggleEditing],
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
          {!isReadOnly && (
            // biome-ignore lint/a11y/useSemanticElements: TODO biome v2.2.2 - look into replacing this with a button element
            <div
              className={`icon ${isEditing ? "icon-close" : "icon-edit"}`}
              onClick={toggleEditing}
              onKeyUp={handleKeyUp}
              onBlur={handleBlur}
              onFocus={handleFocus}
              role="button"
              tabIndex={0}
            />
          )}
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
