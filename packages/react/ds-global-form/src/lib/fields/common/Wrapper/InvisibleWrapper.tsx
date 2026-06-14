/* @canonical/generator-ds 0.9.0-experimental.9 */
import type React from "react";
import type { BaseInputProps, WrapperProps } from "../../types.js";
import { useFieldWrapper } from "./hooks/index.js";

/**
 * InvisibleWrapper component for hidden form inputs.
 * It wraps the specified input component and handles form registration
 * without rendering visible elements like labels or error messages.
 *
 * @param {WrapperProps<ComponentProps>} props - Component props including the Component to wrap and form-related props.
 * @returns {React.ReactElement} - Rendered wrapped component.
 */
const InvisibleWrapper = <ComponentProps extends BaseInputProps>({
  name,
  Component,
  registerProps: userRegisterProps,
  nestedRegisterProps,
  unregisterOnUnmount,
  ...otherProps
}: WrapperProps<ComponentProps>): React.ReactElement => {
  const { registerProps, ariaProps } = useFieldWrapper(name, {
    userRegisterProps,
    nestedRegisterProps,
    unregisterOnUnmount,
  });

  const componentProps = {
    name,
    registerProps,
    ...ariaProps.input,
    ...otherProps,
  } as ComponentProps;

  return <Component {...componentProps} />;
};

export default InvisibleWrapper;
