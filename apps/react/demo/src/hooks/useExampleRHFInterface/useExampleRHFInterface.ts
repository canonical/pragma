import { ORIGINAL_VAR_NAME_KEY, SHOWCASE_EXAMPLES } from "data/index.js";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toGlobalFormStateKey } from "utils/index.js";
import type { ExampleControlField, ShowcaseExample } from "../../ui/index.js";
import type { FormValues, useGlobalFormResult } from "./types.js";

/**
 * Converts the `SHOWCASE_EXAMPLES` to a format expected by React Hook Form, and provides some global form state data
 */
const useExampleRHFInterface = (): useGlobalFormResult => {
  const examples: ShowcaseExample[] = useMemo(
    () =>
      SHOWCASE_EXAMPLES.map((example) => {
        const sections = example.sections.map((section) => {
          const fields = section.fields.map((field) => ({
            ...field,
            // Convert the control name to a global form state key
            name: toGlobalFormStateKey(example.name, field.name),
            // Preserve the control's original (non-domain-scoped) name so it can be used in output
            // The `name` needs to be set to the global form state key in order for updates to propagate
            // However, we also need to be able to reference the original name for output
            // Another way of doing this may be to create a fn that undoes the global form state key transformation
            // but, it's probably less computation and error-prone to just store the original name here.
            [ORIGINAL_VAR_NAME_KEY]: field.name,
          }));
          return {
            ...section,
            fields,
          };
        });
        return {
          ...example,
          sections,
        };
      }),
    [],
  );

  const exampleSettingDefaultValues: FormValues = useMemo(
    () =>
      examples.reduce(
        (exampleAcc, example) => {
          exampleAcc[example.name] = example.sections.reduce(
            (fieldAcc, section) => {
              for (const field of section.fields) {
                const {
                  [ORIGINAL_VAR_NAME_KEY]: originalFieldName,
                  defaultValue,
                } = field;

                if (originalFieldName) {
                  // Check if originalFieldName exists
                  fieldAcc[originalFieldName] = defaultValue;
                }
              }
              return fieldAcc;
            },
            {} as FormValues,
          );
          return exampleAcc;
        },
        {} as Record<string, FormValues>,
      ),
    [examples],
  );

  const methods = useForm({
    mode: "onChange",
    defaultValues: exampleSettingDefaultValues,
  });

  return useMemo(
    () => ({ methods, defaultValues: exampleSettingDefaultValues, examples }),
    [methods, exampleSettingDefaultValues, examples],
  );
};

export default useExampleRHFInterface;
