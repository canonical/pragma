/* @canonical/generator-ds 0.9.0-experimental.12 */
import type React from "react";
import { useMemo } from "react";
import * as icons from "./icons.js";
import "./styles.css";
import type { DiffChangeMarkerProps } from "./types.js";

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
  const displayStyle = markerStyle;
  const isManual = "type" in markerOptions;
  const manualOption = isManual ? markerOptions : undefined;
  const autoOption = isManual ? undefined : markerOptions;

  const changeType = useMemo(() => {
    if (manualOption?.type) {
      return manualOption.type;
    }
    if (autoOption?.additions && autoOption?.deletions) {
      return "modified";
    }
    if (autoOption?.additions) {
      return "added";
    }
    if (autoOption?.deletions) {
      return "deleted";
    }
    return "modified";
  }, [autoOption?.additions, autoOption?.deletions, manualOption?.type]);

  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className, `style-${displayStyle}`]
        .filter(Boolean)
        .join(" ")}
    >
      {displayStyle === "detailed" ? (
        isManual ? (
          <>
            {changeType === "added" && <span className="added">Added</span>}
            {changeType === "deleted" && (
              <span className="deleted">Removed</span>
            )}
            {changeType === "modified" && (
              <span className="modified">Modified</span>
            )}
          </>
        ) : (
          <>
            {markerOptions.deletions > 0 && (
              <span className="deleted">-{markerOptions.deletions}</span>
            )}
            {markerOptions.additions > 0 && (
              <span className="added">+{markerOptions.additions}</span>
            )}
          </>
        )
      ) : (
        <div className={`change-indicator ${changeType}`}>
          {changeType === "added" && icons.AddIcon}
          {changeType === "deleted" && icons.DeleteIcon}
          {changeType === "modified" && icons.ModifyIcon}
        </div>
      )}
    </div>
  );
};

export default DiffChangeMarker;
