import { ORIGINAL_VAR_NAME_KEY, SHOWCASE_EXAMPLES } from "data/index.js";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toGlobalFormStateKey } from "utils/index.js";
import type { ShowcaseExample } from "../../ui/index.js";
import type { FormState, useGlobalFormResult } from "./types.js";

/**
 * Converts the `SHOWCASE_EXAMPLES` to a format expected by React Hook Form, and provides some global form state data
 */
const useExampleRHFInterface = (): useGlobalFormResult => {
  const examples: ShowcaseExample[] = useMemo(
    () =>
      SHOWCASE_EXAMPLES.map((example) => ({
        ...example,
        fields: example.fields.map((control) => ({
          ...control,
          // Convert the control name to a global form state key
          name: toGlobalFormStateKey(example.name, control.name),
          // Preserve the control's original (non-domain-scoped) name so it can be used in output
          // The `name` needs to be set to the global form state key in order for updates to propagate
          // However, we also need to be able to reference the original name for output
          // Another way of doing this may be to create a fn that undoes the global form state key transformation
          // but, it's probably less computation and error-prone to just store the original name here.
          [ORIGINAL_VAR_NAME_KEY]: control.name,
        })),
      })),
    [],
  );

  const defaultValues = useMemo(
    () =>
      examples.reduce((acc, example) => {
        for (const field of example.fields) {
          acc[field.name] = field.defaultValue;
        }
        return acc;
      }, {} as FormState),
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
