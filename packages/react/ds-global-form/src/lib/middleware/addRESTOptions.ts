import type { Middleware, Option } from "lib/Field/types.js";
import { createElement, useEffect, useState } from "react";

interface OptionsFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  transformData?: (data: any) => Option[];
}

function addRESTFieldOptions(
  url: string,
  options: OptionsFetchOptions = {},
  // biome-ignore lint/suspicious/noExplicitAny: TODO
): Middleware<any> {
  const {
    method = "GET",
    headers = {},
    transformData = (data) => data,
  } = options;

  return (WrappedComponent) => {
    return function ExtendedComponent(props) {
      const [optionsData, setOptionsData] = useState<Option[]>([]);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState<string | null>(null);

      useEffect(() => {
        fetch(url, {
          method,
          headers,
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error("Failed to fetch options");
            }
            return response.json();
          })
          .then((data) => {
            const transformed = transformData(data);
            setOptionsData(transformed);
            setLoading(false);
          })
          .catch((err) => {
            setError(err.message);
            setLoading(false);
          });
      }, [url]);

      if (loading) {
        return createElement("div", null, "Loading options...");
      }
      if (error) {
        return createElement("div", null, `Error: ${error}`);
      }
      return createElement(WrappedComponent, {
        ...props,
        options: optionsData,
      });
    };
  };
}

export default addRESTFieldOptions;
