/* @canonical/generator-ds 0.8.0-experimental.0 */
import type React from "react";
import {
  ReactElement,
  ReactNode,
  createContext,
  useContext,
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
  children,
  className,
  style,
  title,
}: EditableBlockProps): React.ReactElement => {
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const toggleEditing = () => {
    setIsEditing((editing) => !editing);
  };

  const handleKeyUp = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      toggleEditing();
    }
  };

  return (
    <EditingContext.Provider value={{ isEditing, toggleEditing }}>
      <div className="editable-block-component">
        <div className="editable-block-component__header">
          <div className="editable-block-component__title">{title}</div>
          <div
            className={`editable-block-component__icon ${isEditing ? "editable-block-component__icon--close" : "editable-block-component__icon--edit"}`}
            onClick={toggleEditing}
            onKeyUp={handleKeyUp}
            onKeyDown={handleKeyUp}
            role="button"
            tabIndex={0}
          />
        </div>
        <div className="editable-block-component__content">
          <div className="editable-block-component__children">
            {typeof children === "function"
              ? children({ isEditing, toggleEditing })
              : children}
          </div>
        </div>
      </div>
    </EditingContext.Provider>
  );
};

export default EditableBlock;
