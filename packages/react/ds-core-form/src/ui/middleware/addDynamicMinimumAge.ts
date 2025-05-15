import { createElement, useCallback, useEffect } from "react";
import type { Middleware } from "ui/Field/types.js";
import { useWatch, useFormContext } from "react-hook-form";
import { register } from "module";

function addDynamicMinAge(inputNameToWatch: string): Middleware<any> {
  return (WrappedComponent) => {
    return function ExtendedComponent(props) {
      const { watch } = useFormContext();
      const countryName = watch(inputNameToWatch);
      let minAge;
      switch (countryName) {
        case "USA":
          minAge = 21;
          break;

        default:
          minAge = 18;
          break;
      }

      return createElement(WrappedComponent, {
        ...props,
        registerProps: {
          ...props.registerProps,
          min: {
            value: minAge,
            message: `Age must be at least ${minAge}`,
          },
        },
      });
    };
  };
}

export default addDynamicMinAge;
