import { ORIGINAL_VAR_NAME_KEY, SHOWCASE_EXAMPLES } from "data/index.js";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { convertToFormKey } from "utils/index.js";
import type { ShowcaseExample } from "../../ui/index.js";
import type { FormValues, useGlobalFormResult } from "./types.js";

/**
 * Converts the `SHOWCASE_EXAMPLES` to a format expected by React Hook Form, and provides some global form state data
 */
const useExampleRHFInterface = (): useGlobalFormResult => {
  const examples: ShowcaseExample[] = useMemo(
    () =>
      SHOWCASE_EXAMPLES.map((example) => ({
        ...example,
        fields: example.fields.map((field) => ({
          ...field,
          // Convert the control name to a global form state key
          name: convertToFormKey(example.id, field.name),
          // Preserve the control's original (non-domain-scoped) name so it can be used in output
          // The `name` needs to be set to the global form state key in order for updates to propagate
          // However, we also need to be able to reference the original name for output
          // Another way of doing this may be to create a fn that undoes the global form state key transformation
          // but, it's probably less computation and error-prone to just store the original name here.
          [ORIGINAL_VAR_NAME_KEY]: field.name,
        })),
      })),
    [],
  );

  const defaultValues = useMemo(
    () =>
      examples.reduce((exampleAcc, example) => {
        // Top level of the default values is a dictionary of example names to their sets of fields
        exampleAcc[example.id] = example.fields.reduce((fieldAcc, field) => {
          // Second level of the default values is a set of fields and default values for each field
          const { [ORIGINAL_VAR_NAME_KEY]: fieldName } = field;
          if (!fieldName) return fieldAcc;
          fieldAcc[fieldName] = field.defaultValue;
          return fieldAcc;
        }, {} as FormValues);
        return exampleAcc;
      }, {} as FormValues),
    [examples],
  );

  const methods = useForm({
    mode: "onChange",
    defaultValues,
  });

  return useMemo(
    () => ({ methods, defaultValues, examples }),
    [methods, defaultValues, examples],
  );
};

export default useExampleRHFInterface;
