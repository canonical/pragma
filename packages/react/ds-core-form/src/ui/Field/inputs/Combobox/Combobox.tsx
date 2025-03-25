/* @canonical/generator-ds 0.9.0-experimental.9 */
import type React from "react";
import type { ComboboxProps } from "./types.js";
import "./styles.css";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import MultipleCombobox from "./MultipleCombobox.js";
import SingleCombobox from "./SingleCombobox.js";

const componentCssClassName = "ds combobox";

/**
 * description of the Combobox component
 * @returns {React.ReactElement} - Rendered Combobox
 */
const Combobox = ({
  className,
  isMultiple = false,
  ...otherProps
}: ComboboxProps): React.ReactElement => {
  const composedClassName = [componentCssClassName, className]
    .filter(Boolean)
    .join(" ");
  if (isMultiple) {
    return <MultipleCombobox className={composedClassName} {...otherProps} />;
  }
  return <SingleCombobox className={composedClassName} {...otherProps} />;
};

export default withWrapper<ComboboxProps>(Combobox);
