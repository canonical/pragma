/* @canonical/generator-ds 0.9.0-experimental.12 */
import type React from "react";
import { DetailedChangeMarker, SimpleChangeMarker } from "./common/index.js";
import "./styles.css";
import type { DiffChangeMarkerProps, DiffChangeType } from "./types.js";

const componentCssClassName = "ds diff-change-marker";

/**
 * Displays a visual indicator for file changes in a diff (added, modified, deleted)
 * Can be displayed in detailed or simple style
 * @returns {React.ReactElement} - Rendered DiffChangeMarker
 */
const DiffChangeMarker = ({
  id,
  className,
  style,
  markerStyle,
  ...markerOptions
}: DiffChangeMarkerProps): React.ReactElement => {
  const isManual = "type" in markerOptions;

  const getChangeType = () => {
    if (isManual) {
      return markerOptions.type;
    }
    if (markerOptions.additions && markerOptions.deletions) {
      return "modified";
    }
    if (markerOptions.additions) {
      return "added";
    }
    if (markerOptions.deletions) {
      return "deleted";
    }
    return "modified";
  };

  const formatChangeType = (type: DiffChangeType): string => {
    switch (type) {
      case "added":
        return "Added";
      case "deleted":
        return "Removed";
      case "modified":
        return "Modified";
    }
  };

  const changeType = getChangeType();

  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className, `style-${markerStyle}`]
        .filter(Boolean)
        .join(" ")}
    >
      {markerStyle === "detailed" ? (
        isManual ? (
          <DetailedChangeMarker
            {...{ [changeType]: formatChangeType(changeType) }}
          />
        ) : (
          <DetailedChangeMarker
            deleted={
              markerOptions.deletions > 0
                ? `-${markerOptions.deletions}`
                : undefined
            }
            added={
              markerOptions.additions > 0
                ? `+${markerOptions.additions}`
                : undefined
            }
          />
        )
      ) : (
        <SimpleChangeMarker changeType={changeType} />
      )}
    </div>
  );
};

export default DiffChangeMarker;
