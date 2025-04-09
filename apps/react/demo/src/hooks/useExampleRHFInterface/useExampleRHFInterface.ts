import { ORIGINAL_VAR_NAME_KEY, SHOWCASE_EXAMPLES } from "data/index.js";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toGlobalFormStateKey } from "utils/index.js";
import type {
  ExampleControlField,
  ExampleControlFieldOpts,
  FieldElementScopeOpts,
  ShowcaseExample,
  ShowcaseExampleOpts,
} from "../../ui/index.js";
import type { FormValues, useGlobalFormResult } from "./types.js";

const scopedFieldOptsToField = (
  exampleOpts: ShowcaseExampleOpts,
  fieldOpts: ExampleControlFieldOpts,
  scopeOpts?: FieldElementScopeOpts,
): ExampleControlField => {
  let elementScopedName = `${[scopeOpts?.scopeName, fieldOpts.name]
    .filter(Boolean)
    .join("-")}`;

  if (!fieldOpts?.disabledOutputFormats?.css) {
    elementScopedName = `--${elementScopedName}`;
  }

  console.log({ exampleOpts, fieldOpts, scopeOpts, elementScopedName });

  // Don't pass entire element scope to the field - it's only needed during field construction to construct separate fields for each scope
  const { elementScopes, ...filteredFieldOpts } = fieldOpts;

  return {
    ...filteredFieldOpts,
    ...scopeOpts,
    name: toGlobalFormStateKey(exampleOpts.name, elementScopedName),
    // Preserve the control's original (non-domain-scoped) name so it can be used in output
    // The `name` needs to be set to the global form state key in order for updates to propagate
    // However, we also need to be able to reference the original name for output
    // Another way of doing this may be to create a fn that undoes the global form state key transformation
    // but, it's probably less computation and error-prone to just store the original name here.
    [ORIGINAL_VAR_NAME_KEY]: elementScopedName,
    defaultValue: scopeOpts?.defaultValue || filteredFieldOpts.defaultValue,
    elementScope: scopeOpts?.scopeName,
  };
};

/**
 * Converts the `SHOWCASE_EXAMPLES` to a format expected by React Hook Form, and provides some global form state data
 */
const useExampleRHFInterface = (): useGlobalFormResult => {
  const examples: ShowcaseExample[] = useMemo(
    () =>
      SHOWCASE_EXAMPLES.map((exampleOpts) => ({
        ...exampleOpts,
        fields: exampleOpts.fields.reduce((acc, fieldOpts) => {
          // Push an unscoped control (affects all elements)
          acc.push(scopedFieldOptsToField(exampleOpts, fieldOpts));
          if (fieldOpts.elementScopes?.length) {
            // Push a scoped control for each element scope
            acc.push(
              ...fieldOpts.elementScopes.map((scope) =>
                scopedFieldOptsToField(exampleOpts, fieldOpts, scope),
              ),
            );
          }
          return acc;
        }, [] as ExampleControlField[]),
      })),
    [],
  );

  const defaultValues = useMemo(
    () =>
      examples.reduce((exampleAcc, example) => {
        // Top level of the default values is a dictionary of example names to their sets of fields
        exampleAcc[example.name] = example.fields.reduce((fieldAcc, field) => {
          // Second level of the default values is a set of fields and default values for each field
          const { [ORIGINAL_VAR_NAME_KEY]: fieldName } = field;
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

  useEffect(() => {
    console.log({ examples, defaultValues });
  }, [defaultValues, examples]);

  return useMemo(
    () => ({ methods, defaultValues, examples }),
    [methods, defaultValues, examples],
  );
};

export default useExampleRHFInterface;
