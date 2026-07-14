import { forwardRef, type ReactElement } from "react";
import type { TextInputProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds input text chrome";

/**
 * Presentational text input — pure markup, no react-hook-form.
 *
 * Usable standalone (controlled via `value`/`onChange`, or uncontrolled) or via
 * the field tier, which spreads react-hook-form's `register()` result onto it.
 * @returns {ReactElement} - Rendered Text
 *
 * `import { TextInput } from "@canonical/react-ds-global-form";`
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput(
    {
      id,
      className,
      style,
      inputType = "text",
      prefix,
      suffix,
      ...nativeProps
    },
    ref,
  ): ReactElement {
    return (
      <div
        id={id}
        style={style}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
      >
        {prefix && <span className="prefix">{prefix}</span>}
        <input type={inputType} ref={ref} {...nativeProps} />
        {suffix && <span className="suffix">{suffix}</span>}
      </div>
    );
  },
);

export default TextInput;
