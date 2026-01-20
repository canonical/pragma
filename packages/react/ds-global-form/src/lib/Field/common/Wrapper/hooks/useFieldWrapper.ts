import { useEffect, useMemo } from "react";
import { type RegisterOptions, useFormContext } from "react-hook-form";

import { useFieldAriaProperties, useFieldError } from "../../../hooks/index.js";
import messages from "../messages.js";

type UseFieldWrapperOptions = {
  label?: string;
  isOptional?: boolean;
  userRegisterProps?: RegisterOptions;
  nestedRegisterProps?: RegisterOptions;
  unregisterOnUnmount?: boolean;
};

/**
 * Hook to provide field wrapper utilities
 * @param name - The name of the field
 * @param options - Additional options
 */
const useFieldWrapper = (
  name: string,
  options: UseFieldWrapperOptions = {},
) => {
  const {
    label,
    isOptional = false,
    userRegisterProps = {},
    nestedRegisterProps = {},
    unregisterOnUnmount = true,
  } = options;

  const fieldError = useFieldError(name);

  const isError = !!fieldError;

  const ariaProps = useFieldAriaProperties(name, isError);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Comparing the `name` suffices
  const registerProps = useMemo(() => {
    const props: RegisterOptions = {};
    // We take advantage of the declaration of optionality to map to the required prop
    if (!isOptional) {
      props.required = {
        value: true,
        message: messages.required(label || name),
      };
    }
    return {
      ...nestedRegisterProps,
      ...props,
      ...userRegisterProps,
    };
  }, [name]);

  const { unregister } = useFormContext();

  // biome-ignore lint/correctness/useExhaustiveDependencies: Comparing the `name` suffices
  useEffect(
    () => () => (unregisterOnUnmount ? unregister(name) : undefined),
    [name],
  );

  return {
    fieldError,
    isError,
    ariaProps,
    registerProps,
  };
};
export default useFieldWrapper;
