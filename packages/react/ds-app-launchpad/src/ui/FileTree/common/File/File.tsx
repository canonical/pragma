/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import { Node } from "../Node/index.js";
import "./styles.css";
import type { FileProps } from "./types.js";

/**
 * description of the File component
 * @returns {React.ReactElement} - Rendered File
 */
const File = ({
  id,
  className,
  style,
  name,
  marker,
}: FileProps): React.ReactElement => {
  return (
    <Node
      id={id}
      className={className}
      style={style}
      name={name}
      nodeType="file"
      marker={marker}
    />
  );
};

export default File;
