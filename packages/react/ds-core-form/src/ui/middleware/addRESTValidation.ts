import { debounce } from "@canonical/utils";
import { createElement, useCallback, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { Middleware } from "ui/Field/types.js";

interface ValidationOptions {
  method?: string;
  headers?: Record<string, string>;
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  bodyFormatter?: (value: any) => any;
  errorExtractor?: (response: Response) => Promise<string> | string;
  minLength?: number;
  debounceWait?: number;
}

function addRESTFieldValidation(
  url: string,
  options: ValidationOptions = {},
  // biome-ignore lint/suspicious/noExplicitAny: TODO
): Middleware<any> {
  const {
    method = "POST",
    headers = { "Content-Type": "application/json" },
    bodyFormatter = (value) => ({ value }),
    errorExtractor = async () => "Validation failed",
    minLength = 3,
    debounceWait = 300,
  } = options;

  return (WrappedComponent) => {
    return function ExtendedComponent(props) {
      const { name } = props;
      const { setError, clearErrors, watch } = useFormContext();
      const value = watch(name);

      const debouncedFetch = useCallback(
        debounce(async (val: string) => {
          const response = await fetch(url, {
            method,
            headers,
            body: JSON.stringify(bodyFormatter(val)),
          });
          if (!response.ok) {
            const errorMessage = await errorExtractor(response);
            setError(name, { type: "manual", message: errorMessage });
          } else {
            clearErrors(name);
          }
        }, debounceWait),
        [],
      );

      useEffect(() => {
        if (value && value.length >= minLength) {
          debouncedFetch(value);
        } else {
          clearErrors(name);
        }
      }, [value, debouncedFetch, name, clearErrors]);

      return createElement(WrappedComponent, props);
    };
  };
}

export default addRESTFieldValidation;
