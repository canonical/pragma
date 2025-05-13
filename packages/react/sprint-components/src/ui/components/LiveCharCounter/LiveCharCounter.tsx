/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from "react";
import { useState, useMemo } from "react";
import type { LiveCharCounterProps } from "./types.js";
import "./styles.css";

const componentWrapperCssClassName = "ds live-char-counter-wrapper";
const componentCssClassName = "ds live-char-counter";
const errorCssClassName = "error";

/**
 * LiveCharCounter component
 * @returns {React.ReactElement} - Rendered LiveCharCounter
 */
const LiveCharCounter = ({
  id,
  className,
  style,
  maxLength = 20,
}: LiveCharCounterProps): React.ReactElement => {
  const [count, setCount] = useState(0);
  const isError = useMemo(() => count > maxLength, [count, maxLength]);

  return (
    <div
      id={id}
      style={style}
      className={componentWrapperCssClassName}
    >
      <textarea
        onChange={(e) => {
          const value = e.target.value;
          setCount(value.length);
        }}
        className={[componentCssClassName, className, isError ? errorCssClassName : "" ].filter(Boolean).join(" ")}
        placeholder={`Type here...(max ${maxLength} characters)`}
      />
      <span>Character count: {count}</span>
    </div>
  );
};

export default LiveCharCounter;
