/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from 'react';
import type { PackageHeaderProps } from './types.js';
import './styles.css';

import { Button } from '@canonical/react-ds-core';

const componentCssClassName = "ds package-header";

/**
 * description of the PackageHeader component
 * @returns {React.ReactElement} - Rendered PackageHeader
 */
const PackageHeader = ({
  id,
  className,
  style,
  packageData,
}: PackageHeaderProps): React.ReactElement => {
  return (
    <div
      id={id}
      style={style}
      className={[
                componentCssClassName,
        className
      ].filter(Boolean).join(" ")}
    >
      <img className="logo" src={packageData.logo} alt="" />
      <div className="meta">
        <h1 className="title">{packageData.name}</h1>
        <a href={packageData.publisher.url}>{packageData.publisher.name}</a>
      </div>
      <div className="install">
        <Button>Install</Button>
      </div>
    </div>
  )
};

export default PackageHeader;