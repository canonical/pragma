/* @canonical/generator-ds 0.9.0-experimental.9 */
import type React from "react";
import type { ComboboxProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds combobox";

/**
 * description of the MultipleCombobox component
 * @returns {React.ReactElement} - Rendered MultipleCombobox
 */
const MultipleCombobox = ({
  id,
  className,
  style,
}: ComboboxProps): React.ReactElement => {
  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      MultipleCombobox
    </div>
  );
};

export default MultipleCombobox;
