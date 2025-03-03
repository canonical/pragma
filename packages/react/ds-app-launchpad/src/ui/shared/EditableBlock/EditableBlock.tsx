/* @canonical/generator-ds 0.8.0-experimental.0 */
import type React from "react";
import {
  ReactElement,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { EditableBlockProps, EditingContextType } from "./types.js";
import "./styles.css";

/**
 * description of the EditableBlock component
 * @returns {React.ReactElement} - Rendered EditableBlock
 */

const EditingContext = createContext<EditingContextType | undefined>(undefined);

export const useEditing = (): EditingContextType => {
  const context = useContext(EditingContext);
  if (!context) {
    throw new Error("useEditing cannot be used directly.");
  }
  return context;
};

const EditableBlock = ({
  id,
  EditComponent,
  className: userClassName,
  styles,
  title,
}: EditableBlockProps): React.ReactElement => {
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const toggleEditing = useCallback(() => {
    setIsEditing((editing) => !editing);
  }, []);

  const handleKeyUp = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        toggleEditing();
      }
    },
    [toggleEditing],
  );

  const componentClassName = useMemo(() => {
    return ["ds", "editable-block", userClassName].filter(Boolean).join(" ");
  }, [userClassName]);

  return (
    <EditingContext.Provider value={{ isEditing, toggleEditing }}>
      <div className={componentClassName}>
        <div className="header">
          <div className="title">{title}</div>
          <div
            className={`icon ${isEditing ? "icon-close" : "icon-edit"}`}
            onClick={toggleEditing}
            onKeyUp={handleKeyUp}
            onKeyDown={handleKeyUp}
            role="button"
            tabIndex={0}
          />
        </div>
        <div className="content">
          <div className="children">
            {EditComponent && (
              <EditComponent
                isEditing={isEditing}
                toggleEditing={toggleEditing}
              />
            )}
          </div>
        </div>
      </div>
    </EditingContext.Provider>
  );
};

export default EditableBlock;
