import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { ORIGINAL_VAR_NAME_KEY, SHOWCASE_EXAMPLES } from "../../data/index.js";
import { toGlobalFormStateKey } from "../../util/index.js";
import type { FormState, useGlobalFormResult } from "./types.js";

/**
 * State management for a global form
 * This allows app state to be managed in a single location and be persisted across components
 * todo should this be a context provider instead? Currently `application.tsx` uses this and embeds the rest of the app inside
 * It's unlikely it would be used elsewhere, so the value of making it a context provider is unclear
 */
const useGlobalForm = (): useGlobalFormResult => {
  const examples = useMemo(
    () =>
      SHOWCASE_EXAMPLES.map((example) => ({
        ...example,
        controls: example.controls.map((control) => ({
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
        for (const control of example.controls) {
          acc[control.name] = control.defaultValue;
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

export default useGlobalForm;
