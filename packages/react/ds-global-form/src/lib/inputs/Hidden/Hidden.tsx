import { forwardRef, type ReactElement } from "react";
import type { HiddenPresentationProps } from "./types.js";

const componentCssClassName = "ds form-hidden";

/**
 * Presentational hidden input — pure markup, no react-hook-form.
 * @returns {ReactElement} - Rendered Hidden input
 */
export const Hidden = forwardRef<HTMLInputElement, HiddenPresentationProps>(
  function Hidden({ id, className, style, ...nativeProps }, ref): ReactElement {
    return (
      <input
        id={id}
        style={style}
        type="hidden"
        ref={ref}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        {...nativeProps}
      />
    );
  },
);

export default Hidden;
