import { createElement } from "react";
import { useFormContext } from "react-hook-form";
import type { Middleware } from "ui/Field/types.js";

function addConditionalDisplay(
  dependencies: string[],
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  conditionFunction: (depsValues: any[]) => boolean,
  // biome-ignore lint/suspicious/noExplicitAny: TODO
): Middleware<any> {
  return (WrappedComponent) => {
    return function ExtendedComponent(props) {
      const { watch } = useFormContext();
      const depsValues = watch(dependencies);
      const shouldDisplay = conditionFunction(depsValues);

      if (shouldDisplay) {
        return createElement(WrappedComponent, props);
      }
      return null;
    };
  };
}

export default addConditionalDisplay;
