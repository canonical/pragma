import type React from "react";
import { useMemo } from "react";
import { states } from "#lib/constants.js";
import {
  Description,
  Error as FieldError,
  Label,
} from "#lib/subcomponent/Field/index.js";
import type { BaseInputProps, WrapperProps } from "../types.js";
import { useFieldWrapper } from "./hooks/index.js";
import "./styles.css";
import "./ToggleWrapper.css";

const componentCssClassName = "ds field field-toggle";

/**
 * Field wrapper for toggle inputs (checkbox, switch), where the control sits
 * inline beside its label instead of stacked below it.
 *
 * Two label slots:
 * - `controlLabel` — the inline label beside the control; it carries the real
 *   `htmlFor` binding. Falls back to `label` when omitted, so a uniform field
 *   map (`{ label, name, inputType }`) still produces a properly labelled
 *   control.
 * - `label` — an optional heading rendered above the control (and description).
 *   It only shows as a heading when `controlLabel` is also set; otherwise it is
 *   used as the inline control label.
 *
 * @returns {React.ReactElement} - Rendered toggle field
 *
 * `import { ToggleWrapper } from "@canonical/react-ds-global-form";`
 */
const ToggleWrapper = <ComponentProps extends BaseInputProps>({
  id,
  className,
  style,

  name,
  Component,
  description,
  label,
  controlLabel,
  isOptional,
  requiredIndicator,
  registerProps: userRegisterProps,
  nestedRegisterProps,
  unregisterOnUnmount,

  ...otherProps
}: WrapperProps<ComponentProps>): React.ReactElement => {
  // The inline label (beside the control) always carries the htmlFor binding;
  // the heading only appears when a distinct controlLabel was supplied. At
  // least one of `label`/`controlLabel` is guaranteed by the type of the toggle
  // field props, so no runtime check is needed here.
  const inlineLabel = controlLabel ?? label;
  const headingLabel = controlLabel && label ? label : undefined;

  const { fieldError, isError, ariaProps, registerProps } = useFieldWrapper(
    name,
    {
      label: inlineLabel,
      isOptional,
      userRegisterProps,
      nestedRegisterProps,
      unregisterOnUnmount,
    },
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: comparing name suffices
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
      {/* Optional heading above the control (mock label — no htmlFor). */}
      {headingLabel && (
        <Label name={name} tag="legend" className="field-toggle-heading">
          {headingLabel}
        </Label>
      )}

      {description && (
        <Description {...ariaProps.description}>{description}</Description>
      )}

      {/* The control and its inline true label, side by side. */}
      <div className="field-toggle-control">
        <Component {...componentProps} />
        <Label
          name={name}
          isOptional={isOptional}
          requiredIndicator={requiredIndicator}
          {...ariaProps.label}
        >
          {inlineLabel}
        </Label>
      </div>

      {isError && (
        <FieldError {...ariaProps.error}>
          {fieldError?.message?.toString()}
        </FieldError>
      )}
    </div>
  );
};

export default ToggleWrapper;
