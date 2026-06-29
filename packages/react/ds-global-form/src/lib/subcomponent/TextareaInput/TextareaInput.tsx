import { forwardRef, type ReactElement } from "react";
import type { TextareaInputProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds input textarea chrome";

/**
 * Presentational textarea input — pure markup, no react-hook-form.
 *
 * Usable standalone (controlled via `value`/`onChange`, or uncontrolled) or via
 * the field tier, which spreads react-hook-form's `register()` result onto it.
 * @returns {ReactElement} - Rendered TextareaInput
 */
export const TextareaInput = forwardRef<
  HTMLTextAreaElement,
  TextareaInputProps
>(function TextareaInput(
  { id, className, style, ...nativeProps },
  ref,
): ReactElement {
  return (
    <textarea
      id={id}
      style={style}
      className={[componentCssClassName, "p", className]
        .filter(Boolean)
        .join(" ")}
      ref={ref}
      {...nativeProps}
    />
  );
});

export default TextareaInput;
