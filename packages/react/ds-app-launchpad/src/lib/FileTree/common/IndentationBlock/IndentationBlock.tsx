/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import { useId } from "react";
import "./styles.css";
import type { IndentationBlockProps } from "./types.js";

const componentCssClassName = "ds indentation-block";

/**
 * description of the IndentationBlock component
 * @returns {React.ReactElement} - Rendered IndentationBlock
 */
const IndentationBlock = ({
  id,
  className,
  style,
  depth,
}: IndentationBlockProps): React.ReactElement | null => {
  const uid = useId();

  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      {Array.from({ length: depth }).map((_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: index is prefixed with a uid
        <div key={`${uid}-${index}`} className="indent-block">
          &nbsp;
        </div>
      ))}
      {depth === 0 && <div className="indent-block empty">&nbsp;</div>}
    </div>
  );
};

export default IndentationBlock;
