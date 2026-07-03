/* @canonical/generator-ds 0.9.0-experimental.9 */
import { forwardRef } from "react";
import MultipleCombobox from "./MultipleCombobox.js";
import SingleCombobox from "./SingleCombobox.js";
import type { ComboboxInputProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds combobox";

/**
 * Presentational combobox (controlled, no react-hook-form). Routes to the
 * single- or multiple-select implementation. The forwarded ref targets the
 * text input of the single-select variant.
 *
 * `import { ComboboxInput } from "@canonical/react-ds-global-form";`
 */
export const ComboboxInput = forwardRef<HTMLInputElement, ComboboxInputProps>(
  function ComboboxInput(
    { className, isMultiple = false, ...otherProps },
    ref,
  ) {
    const composedClassName = [componentCssClassName, className]
      .filter(Boolean)
      .join(" ");
    if (isMultiple) {
      return <MultipleCombobox className={composedClassName} {...otherProps} />;
    }
    return (
      <SingleCombobox ref={ref} className={composedClassName} {...otherProps} />
    );
  },
);

export default ComboboxInput;
