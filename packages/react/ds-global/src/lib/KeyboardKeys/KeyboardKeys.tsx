import type React from "react";
import type { KeyboardKeysProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds keyboard-keys";

/**
 * KeyboardKeys groups two or more KeyboardKey components into a single
 * inline unit with consistent spacing. Use it to represent multi-key
 * shortcuts (e.g., Ctrl + C) or key sets (e.g., arrow keys) as a
 * visually cohesive group. It accepts arbitrary children, including
 * separator text, alongside KeyboardKey instances.
 *
 * @implements dso:global.group.keyboard_keys
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
