import type React from "react";
import { KEY_LABELS } from "./constants.js";
import type { KeyboardKeyProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds keyboard-key";

/**
 * The KeyboardKey component renders a single keyboard key as a styled
 * kbd element. It maps a key identifier (letters, digits, modifiers,
 * function keys, navigation keys, and action keys) to its display label
 * and presents it as a compact, inline visual indicator. Use it to
 * represent keyboard shortcuts, key bindings, or individual keys within
 * instructional or reference content. It is non-interactive and purely
 * informational.
 *
 * @implements dso:global.component.keyboard_key
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
