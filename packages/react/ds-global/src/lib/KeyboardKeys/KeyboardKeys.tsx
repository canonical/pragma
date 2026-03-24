import type React from "react";
import type { KeyboardKeysProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds keyboard-keys";

/**
 * KeyboardKeys component
 */
const KeyboardKeys = ({
  className,
  children,
  ...props
}: KeyboardKeysProps): React.ReactElement => {
  return (
    <kbd
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </kbd>
  );
};

export default KeyboardKeys;
