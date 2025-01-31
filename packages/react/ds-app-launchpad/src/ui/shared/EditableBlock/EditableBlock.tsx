/* @canonical/generator-ds 0.8.0-experimental.0 */
import React, { createContext, useContext, useState, cloneElement, ReactElement } from 'react';
import type { EditableBlockProps, EditingContextType } from './types.js';
import "./styles.css";

/**
 * description of the EditableBlock component
 * @returns {React.ReactElement} - Rendered EditableBlock
 */

const EditingContext = createContext<EditingContextType | undefined>(undefined);

export const useEditing = (): EditingContextType => {
  const context = useContext(EditingContext);
  if (!context) {
    throw new Error("useEditing shouldn't be used directly.");
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

  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return cloneElement(child as ReactElement<any>, { isEditing });
    }
    return child;
  });

  return (
    <EditingContext.Provider value={{ isEditing, toggleEditing }}>
      <div className="editable-block-component">
        <div className="editable-block-component__header">
          <div className="editable-block-component__title">
            {title}
          </div>
          <div className="editable-block-component__icon" onClick={toggleEditing}>
            <span role="img" aria-label="icon">🖉</span>
          </div>
        </div>
        <div className="editable-block-component__content">
          <div className="editable-block-component__children">
            {childrenWithProps}
          </div>
        </div>
      </div>
    </EditingContext.Provider>
  )
};

export default EditableBlock;
