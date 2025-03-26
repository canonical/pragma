/* @canonical/generator-ds 0.9.0-experimental.9 */
import type React from "react";
import { useFormContext } from "react-hook-form";
import type { HiddenProps } from "./types.js";
import "./styles.css";
import withWrapper from "../../common/Wrapper/withWrapper.js";

const componentCssClassName = "ds form-hidden";

/**
 * Hidden input component for forms, used to store values that are submitted but not visible to the user.
 * @returns {React.ReactElement} - Rendered Hidden input
 */
const Hidden = ({
  id,
  className,
  style,
  name,
  registerProps,
  ...otherProps
}: HiddenProps): React.ReactElement => {
  const { register } = useFormContext();
  return (
    <input
      id={id}
      style={style}
      type="hidden"
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...otherProps}
      {...register(name, registerProps)}
    />
  );
};

export default withWrapper<HiddenProps>(Hidden);
