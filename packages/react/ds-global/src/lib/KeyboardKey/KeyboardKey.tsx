import type React from "react";
import { KEY_LABELS } from "./constants.js";
import type { KeyboardKeyProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds keyboard-key";

/**
 * KeyboardKey component
 */
const KeyboardKey = ({
  keyValue,
  className,
  ...props
}: KeyboardKeyProps): React.ReactElement => (
  <kbd
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    {...props}
  >
    {KEY_LABELS[keyValue] ?? keyValue}
  </kbd>
);

export default KeyboardKey;
