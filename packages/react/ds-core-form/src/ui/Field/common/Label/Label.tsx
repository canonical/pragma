/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from 'react';
import type { LabelProps } from './types.js';
import './styles.css';

const componentCssClassName = "ds label";
  
/**
 * description of the Label component
 * @returns {React.ReactElement} - Rendered Label
 */
const Label = ({
  id,
  children,
  className,
  style
}: LabelProps): React.ReactElement => {
  return (
    <div
      id={id}
      style={style}
      className={[
                componentCssClassName,
        className
      ].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  )
};

export default Label;