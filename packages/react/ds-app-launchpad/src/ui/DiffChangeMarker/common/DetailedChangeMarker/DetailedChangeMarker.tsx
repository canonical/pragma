/* @canonical/generator-ds 0.9.0-experimental.12 */
import type React from "react";
import type { DetailedChangeMarkerProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds detailed-change-marker";

const DetailedChangeMarker = ({
  id,
  className,
  style,
  added,
  deleted,
  modified,
}: DetailedChangeMarkerProps): React.ReactElement => {
  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      {added && <span className="added">{added}</span>}
      {deleted && <span className="deleted">{deleted}</span>}
      {modified && <span className="modified">{modified}</span>}
    </div>
  );
};

export default DetailedChangeMarker;
