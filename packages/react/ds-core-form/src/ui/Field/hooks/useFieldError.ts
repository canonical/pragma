import { useMemo } from "react";
import {
  type FieldError,
  type FieldErrorsImpl,
  type Merge,
  useFormState,
} from "react-hook-form";

function useFieldError(name: string) {
  const { errors } = useFormState({ name });

  const fieldTree = name.split(".");

  // biome-ignore lint/correctness/useExhaustiveDependencies: using a proxy
  const fieldError = useMemo(
    (): FieldError | Merge<FieldError, FieldErrorsImpl> =>
      fieldTree.reduce((acc, key) => {
        if (acc) {
          return acc[key];
        }
        return undefined;
      }, errors),
    [
      name, //proxy for errors
      errors[fieldTree[0]],
      errors[fieldTree[0]]?.[fieldTree[1]],
      errors[fieldTree[0]]?.[fieldTree[1]]?.[fieldTree[2]],
    ],
  );
  return fieldError;
}

export default useFieldError;
