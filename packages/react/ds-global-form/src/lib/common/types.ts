import type { ComponentProps, ComponentType } from "react";
import type { RegisterOptions } from "react-hook-form";
import type { RequiredIndicator } from "../subcomponent/Field/Label/types.js";

// Field-composition machinery types, shared by `Wrapper` and `bindField` and by
// every `*Field` component. Kept in `common/` (not a tier) so any tier may
// depend on them downward. The `FieldProps` aggregator union (which depends on
// every concrete field) stays with the Field pattern, not here.

/**
 * The design-system props a field adds on top of its root element's native
 * props: the react-hook-form binding and the aria wiring the wrapper computes.
 */
type FieldOwnProps = {
  name: string;
  registerProps?: RegisterOptions;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-errormessage"?: string;
  "aria-invalid"?: boolean;
};

/**
 * What the field machinery requires of an input component: the design-system
 * field props, plus the three native `<div>` attributes the wrapper applies to
 * the field root itself rather than forwarding to the input.
 *
 * This is a CONSTRAINT, not a public props type — it is deliberately the small
 * set the wrapper needs, so any concrete field satisfies it. The field root's
 * full native surface is carried by {@link InputProps}, which every `*FieldProps`
 * is built from.
 */
export type BaseInputProps = FieldOwnProps &
  Pick<ComponentProps<"div">, "id" | "className" | "style">;

/**
 * A concrete field: the design-system field props, the presentational input's
 * own props, and whatever native `<div>` attributes neither of them claims.
 *
 * The input's props are subtracted from the native half rather than intersected
 * with it. The wrapper forwards every prop it does not itself consume to the
 * input, so those keys belong to the input's element: `onChange` on a text
 * field has to be the `<input>`'s handler, not an intersection of that with the
 * root `<div>`'s, which would leave the event's `target` untypable.
 */
export type InputProps<
  // biome-ignore lint/complexity/noBannedTypes: Inputs might in some cases not add props to the base set
  // biome-ignore lint/suspicious/noExplicitAny: In the case of a custom component, we'd expect
  AdditionalComponentProps extends Record<string, any> = {},
> = FieldOwnProps &
  AdditionalComponentProps &
  Omit<
    ComponentProps<"div">,
    keyof FieldOwnProps | keyof AdditionalComponentProps
  >;

/**
 * At least one of `label`/`controlLabel` — the toggle-field label requirement,
 * expressed as a union so a label-less toggle is a compile error rather than a
 * runtime check.
 */
export type ToggleLabelProps =
  | { label: string; controlLabel?: string }
  | { label?: string; controlLabel: string };

/**
 * Props for toggle fields (checkbox, switch), which render the control inline
 * with its label via the ToggleWrapper. On top of the usual input props they
 * add `controlLabel` (the inline label beside the control) and require at least
 * one of `label`/`controlLabel`. `label` alone is the inline label (the
 * field-map case); `label` + `controlLabel` renders `label` as a heading above
 * and `controlLabel` inline.
 */
export type ToggleFieldProps<
  // biome-ignore lint/complexity/noBannedTypes: toggle inputs may add no extra props
  // biome-ignore lint/suspicious/noExplicitAny: presentational prop shapes vary
  AdditionalComponentProps extends Record<string, any> = {},
> = InputProps<AdditionalComponentProps> & ToggleLabelProps;

/**
 * The props the wrapper consumes itself rather than forwarding to the input:
 * the input to render, plus the three native `<div>` attributes it applies to
 * its own root (`className` is merged with the design-system class rather than
 * replacing it, so it cannot simply be spread through).
 */
type WrapperOwnProps<InputComponentProps> = {
  /* The input to render */
  Component: ComponentType<InputComponentProps>;
} & Pick<ComponentProps<"div">, "id" | "className" | "style">;

/**
 * The wrapper is always composed with the props of the input it wraps (see
 * {@link WrapperProps}), and those already carry the field root's full native
 * `<div>` surface through {@link InputProps} — so this type adds only what the
 * wrapper consumes itself. Re-adding `Omit<ComponentProps<"div">, keyof
 * InputComponentProps>` here would be empty for every concrete field and, being
 * deferred on an unresolved type parameter, defeats declaration emit for the
 * HOCs built on it.
 */
export type BaseWrapperProps<InputComponentProps> =
  WrapperOwnProps<InputComponentProps>;

export type WrapperProps<InputComponentProps> =
  BaseWrapperProps<InputComponentProps> & {
    /* The description of the input. Will be a child of p.ds.field-description */
    description?: string;

    /* The name of input labelled */
    label?: string;

    /* Toggle fields (checkbox, switch) only: the inline label rendered beside the
     * control, which carries the real `htmlFor` binding. When omitted it falls
     * back to `label`; when both are set, `label` becomes the heading above and
     * `controlLabel` the inline control label. */
    controlLabel?: string;

    /* Toggle fields only: which side of the control the inline label sits on.
     * "after" (default) — label follows the control, the checkbox convention.
     * "before" — label leads, to the LEFT of the control; the switch convention,
     * where a label before the switch names its PURPOSE (a label after would
     * instead read as the switch's state). */
    labelPosition?: "before" | "after";

    /* Is the field optional */
    isOptional?: boolean;

    /* Which convention marks required/optional fields in the label. Default:
     * "required" (a "*" marker before the label of required fields). */
    requiredIndicator?: RequiredIndicator;

    /* TODO */
    nestedRegisterProps?: RegisterOptions;

    /* Whether to unregister the field on unmount */
    unregisterOnUnmount?: boolean;

    /* Whether to mock the label */
    mockLabel?: boolean;
  } & InputComponentProps;

export type Middleware<InputComponentProps> = (
  Component: ComponentType<InputComponentProps>,
) => ComponentType<InputComponentProps>;

export type Condition = [string[], (depsValues: unknown[]) => boolean];

export type WrapperHOCAdditionalProps<
  InputComponentProps extends BaseInputProps,
  ComponentWrapperProps extends
    BaseWrapperProps<InputComponentProps> = WrapperProps<InputComponentProps>,
> = {
  /**
   * middleware to apply to the input
   **/
  middleware?: Middleware<InputComponentProps>[];

  /**
   * An optional wrapper component to render around the input.
   */
  WrapperComponent?: ComponentType<ComponentWrapperProps>;

  /**
   * A condition to determine whether to render the component or not.
   */
  condition?: Condition;
};

export type WrappedComponentProps<
  InputComponentProps extends BaseInputProps,
  ComponentWrapperProps extends
    BaseWrapperProps<InputComponentProps> = WrapperProps<InputComponentProps>,
> = ComponentWrapperProps &
  WrapperHOCAdditionalProps<InputComponentProps, ComponentWrapperProps>;
