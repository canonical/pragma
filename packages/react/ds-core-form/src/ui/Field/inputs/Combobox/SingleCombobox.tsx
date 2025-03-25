/* @canonical/generator-ds 0.9.0-experimental.9 */
import type React from "react";
import type { ComboboxProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds combobox";

/**
 * description of the SingleCombobox component
 * @returns {React.ReactElement} - Rendered SingleCombobox
 */
const SingleCombobox = ({
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
      Single Combobox
    </div>
  );
};

export default SingleCombobox;
