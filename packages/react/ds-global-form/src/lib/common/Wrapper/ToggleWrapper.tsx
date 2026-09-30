import type React from "react";
import { states } from "../../constants.js";
import {
  Description,
  Error as FieldError,
  Label,
} from "../../subcomponent/Field/index.js";
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
  labelPosition = "after",
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

  // Computed inline (not memoised) so `...otherProps` — disabled, onChange,
  // etc. — never goes stale between renders.
  const componentProps = {
    name,
    registerProps,
    ...ariaProps.input,
    ...otherProps,
  } as unknown as ComponentProps;

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

      {/* The control and its inline true label, side by side. The label is
          often a full sentence, so it wraps as prose beside the control. DOM
          order stays control-then-label; `labelPosition: "before"` visually
          moves the label to the LEFT via CSS (the switch convention), keeping
          the accessible order stable. */}
      <div
        className={["field-toggle-control", `label-${labelPosition}`].join(" ")}
      >
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

      {/* Description sits after the control on toggle fields. */}
      {description && (
        <Description {...ariaProps.description}>{description}</Description>
      )}

      {isError && (
        <FieldError {...ariaProps.error}>
          {fieldError?.message?.toString()}
        </FieldError>
      )}
    </div>
  );
};

export default ToggleWrapper;
