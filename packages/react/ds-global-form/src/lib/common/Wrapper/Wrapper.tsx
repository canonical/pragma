/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import { useMemo } from "react";
import { states } from "#lib/constants.js";
import {
  Description,
  Error as FieldError,
  Label,
} from "#lib/subcomponent/Field/index.js";
import type { BaseInputProps, WrapperProps } from "../types.js";
import "./styles.css";
import { useFieldWrapper } from "./hooks/index.js";

const componentCssClassName = "ds field";

/**
 * description of the Wrapper component
 * @returns {React.ReactElement} - Rendered Wrapper
 *
 * `import { Wrapper } from "@canonical/react-ds-global-form";`
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
  requiredIndicator,
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
        requiredIndicator={requiredIndicator}
        tag={mockLabel ? "legend" : undefined}
        {...ariaProps.label}
      >
        {label}
      </Label>
      <div className="payload">
        {description && (
          <Description {...ariaProps.description}>{description}</Description>
        )}
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
