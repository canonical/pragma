import * as React from "react";
import { useMemo } from "react";
import type { FieldProps, FormInputHOC } from "../../types.js";
import DefaultWrapper from "./Wrapper.js";
import type { WrapperProps } from "./types.js";
// import MockWrapper from './WrapperContent.js'
// import type { WrapperProps } from './types.js'
// import withConditionalDisplay from './withConditionalDisplay.js'

const withWrapper = (
  Component: React.ComponentType<FieldProps>,
  options?: WrapperProps,
  Wrapper: typeof DefaultWrapper = DefaultWrapper,
) => {
  const MemoizedComponent = React.memo(Component);

  function WrappedComponent({
    middleware = [],
    ...props
  }: FieldProps): React.ReactElement {
    // We apply the middleware to the component in reverse orderso
    // so that the first middleware in the array is the first to be applied to the component
    const ExtendedComponent = useMemo(
      () =>
        middleware
          .reverse()
          .reduce<React.ComponentType<FieldProps>>(
            (AccumulatedComponent, hoc) => hoc(AccumulatedComponent),
            MemoizedComponent,
          ),
      [middleware],
    );

    // The wrapper can also dynamically change based on the props passed to the component
    const { WrapperComponent = Wrapper } = props;

    return React.createElement(WrapperComponent, {
      Component: ExtendedComponent,
      ...props,
      ...options,
    });
  }
  // return withConditionalDisplay(WrappedComponent)
  return WrappedComponent;
};

export default withWrapper;
