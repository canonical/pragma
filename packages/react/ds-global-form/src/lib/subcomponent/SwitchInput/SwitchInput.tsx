import { forwardRef, type ReactElement } from "react";
import type { SwitchInputProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds form-switch";

/**
 * Presentational switch input — pure markup, no react-hook-form.
 *
 * A switch is a checkbox with `role="switch"`, styled as a sliding toggle.
 * Usable standalone (controlled via `checked`/`onChange`, or uncontrolled) or
 * via the field tier, which spreads react-hook-form's `register()` result onto
 * it. Do not use directly in a form — use SwitchField instead.
 * @returns {ReactElement} - Rendered Switch
 *
 * `import { SwitchInput } from "@canonical/react-ds-global-form";`
 */
export const SwitchInput = forwardRef<HTMLInputElement, SwitchInputProps>(
  function SwitchInput(
    { id, className, style, ...nativeProps },
    ref,
  ): ReactElement {
    return (
      <input
        id={id}
        style={style}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        ref={ref}
        {...nativeProps}
        // `type`/`role` are the fixed switch semantics: spread `nativeProps`
        // BEFORE them so they can never be overridden (belt-and-suspenders with
        // omitting the keys from SwitchInputProps).
        type="checkbox"
        // biome-ignore lint/a11y/useAriaPropsForRole: a native checkbox exposes its checked state to the a11y tree, so role="switch" needs no explicit aria-checked.
        role="switch"
      />
    );
  },
);

export default SwitchInput;
