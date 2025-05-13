/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from "react";
import type { ProgressBarProps } from "./types.js";
import "./styles.css";

/**
 * A bar to display progress for file uploads or any long-running progress with a percentage of completion to report on.
 * @returns {React.ReactElement} - Rendered ProgressBar
 */
const ProgressBar = ({
  id,
  percentage,
  className,
}: ProgressBarProps): React.ReactElement => {
  return (
    <div
      id={id}
      className={[className, "p-progress-bar"].filter(Boolean).join(" ")}
      title={`Progress ${percentage}% done`}
    >
      <div style={{ width: `${percentage}%` }} />
    </div>
  );
};

export default ProgressBar;
