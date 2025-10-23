/* @canonical/generator-ds 0.10.0-experimental.5 */

import type React from 'react';
import type { AnatomyDemoProps } from './types.js';
import './styles.css';

const componentCssClassName = "ds anatomy-demo";
  
/**
 * description of the AnatomyDemo component
 */
const AnatomyDemo = ({
  className,
  children,
  ...props
}: AnatomyDemoProps): React.ReactElement => {
  return (
    <div
      className={[
                componentCssClassName,
        className
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </div>
  )
};

export default AnatomyDemo;