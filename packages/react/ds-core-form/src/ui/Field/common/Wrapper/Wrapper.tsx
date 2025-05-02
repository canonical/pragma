/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import { useMemo } from "react";
import type { BaseInputProps, WrapperProps } from "../../types.js";
import "./styles.css";
import { states } from "../../../constants.js";
import { Description, Error as FieldError, Label } from "../index.js";
import { useFieldWrapper } from "./hooks/index.js";

const componentCssClassName = "ds form-wrapper";

/**
 * description of the Wrapper component
 * @returns {React.ReactElement} - Rendered Wrapper
 */
const Wrapper = <ComponentProps extends BaseInputProps>({
  id,
  className,
  style,

  name,
  Component,
  description,
  label,
  isOptional,
  registerProps: userRegisterProps,
  nestedRegisterProps,
  unregisterOnUnmount,

  mockLabel = false,
  ...otherProps
}: WrapperProps<ComponentProps>): React.ReactElement => {
  const { fieldError, isError, ariaProps, registerProps } = useFieldWrapper(
    name,
    {
      label,
      isOptional,
      userRegisterProps,
      nestedRegisterProps,
      unregisterOnUnmount,
    },
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: -
  const componentProps = useMemo(
    () => ({
      name,
      registerProps,
      ...ariaProps.input,
      ...otherProps,
    }),
    [name, registerProps, ariaProps.input],
  ) as unknown as ComponentProps;

  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className, isError && states.Danger]
        .filter(Boolean)
        .join(" ")}
    >
      <Label
        name={name}
        isOptional={isOptional}
        tag={mockLabel ? "legend" : undefined}
        {...ariaProps.label}
      >
        {label}
      </Label>
      <div className="payload">
        <Description {...ariaProps.description}>{description}</Description>
        <Component {...componentProps} />
        {isError && (
          <FieldError {...ariaProps.error}>
            {fieldError?.message?.toString()}
          </FieldError>
        )}
      </div>
    </div>
  );
};

export default Wrapper;
