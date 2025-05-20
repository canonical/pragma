/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from "react";
import type { ResultsListProps } from "./types.js";

/**
 * description of the ResultsList component
 * @returns {React.ReactElement} - Rendered ResultsList
 */
const ResultsList = ({
  id,
  children,
  className,
  style,
}: ResultsListProps): React.ReactElement => {
  return (
    <div
      id={id}
      style={style}
      className={[className].filter(Boolean).join(" ")}
    >
      The results go here
    </div>
  );
};

export default ResultsList;
