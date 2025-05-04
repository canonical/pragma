import React from "react";
import { useFormContext } from "react-hook-form";
import type { BaseInputProps, WrappedComponentProps } from "../../types.js";

type WrappedComponentPropsInternal<ComponentProps extends BaseInputProps> =
  Omit<WrappedComponentProps<ComponentProps>, "Component"> & {
    condition?: [string[], (depsValues: unknown[]) => boolean];
  };

// TODO improve typing of P
const withConditionalDisplay = <ComponentProps extends BaseInputProps>(
  WrappedComponent: React.ComponentType<ComponentProps>,
) => {
  const ConditionalComponent = (
    props: WrappedComponentPropsInternal<ComponentProps>,
  ) => {
    const { condition, ...otherProps } = props;
    if (!condition)
      return React.createElement(WrappedComponent, props as ComponentProps);
    const [dependencies, conditionFunction] = condition;

    const { watch } = useFormContext();
    const depValues = watch(dependencies);
    const shouldRender = conditionFunction(depValues);
    if (!shouldRender) return null;
    return React.createElement(WrappedComponent, otherProps as ComponentProps);
  };
  return ConditionalComponent;
};

export default withConditionalDisplay;
