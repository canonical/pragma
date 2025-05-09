import * as React from "react";
import { useMemo } from "react";
import type {
  BaseInputProps,
  BaseWrapperProps,
  Condition,
  WrappedComponentProps,
  WrapperProps,
} from "../../types.js";
import DefaultWrapper from "./Wrapper.js";
import withConditionalDisplay from "./withConditionalDisplay.js";

type WrappedComponentPropsInternal<ComponentProps extends BaseInputProps> =
  Omit<WrappedComponentProps<ComponentProps>, "Component"> & {
    condition?: Condition;
  };

const withWrapper = <
  ComponentProps extends BaseInputProps,
  ComponentWrapperProps extends
    BaseWrapperProps<ComponentProps> = WrapperProps<ComponentProps>,
>(
  Component: React.ComponentType<ComponentProps>,
  options?: Partial<ComponentWrapperProps>,
  Wrapper: React.ComponentType<WrapperProps<ComponentProps>> = DefaultWrapper,
  // Ideally, we should use something like this, but this creates a type error for the WrappedComponentProps
  // Wrapper: React.ComponentType<ComponentWrapperProps> = DefaultWrapper as React.ComponentType<ComponentWrapperProps>,
) => {
  const MemoizedComponent = React.memo(Component);

  function WrappedComponent({
    middleware = [],
    WrapperComponent = Wrapper,
    ...props
  }: WrappedComponentPropsInternal<ComponentProps>): React.ReactElement {
    // We apply the middleware to the component in reverse orderso
    // so that the first middleware in the array is the first to be applied to the component

    const ExtendedComponent = useMemo(
      () =>
        // The middleware happens between the Wrapper and the Component,
        // hence the return type of P
        middleware
          .reverse()
          .reduce<React.ComponentType<ComponentProps>>(
            (AccumulatedComponent, hoc) => hoc(AccumulatedComponent),
            MemoizedComponent,
          ),
      [middleware],
    );

    // Type casting to avoid hard to read overloads.
    const finalProps = {
      // Component: MemoizedComponent,
      Component: ExtendedComponent,
      ...props,
      ...options,
    };
    // } as WrapperProps<ComponentProps>; // The typing should be ComponentWrapperProps, but it would require an overload

    return React.createElement(
      WrapperComponent,
      finalProps as WrapperProps<ComponentProps>,
    );
  }
  return withConditionalDisplay(WrappedComponent);
};

export default withWrapper;
