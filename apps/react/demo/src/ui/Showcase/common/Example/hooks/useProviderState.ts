import { ORIGINAL_VAR_NAME_KEY } from "data/index.js";
import { useExampleRHFInterface } from "hooks/index.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { ExampleOutputFormat, Output } from "../types.js";
import type { UseProviderStateProps, UseProviderStateResult } from "./types.js";

/**
 * Hook to manage the state of the provider
 */
const useProviderState = ({
  outputFormats = ["css"],
}: UseProviderStateProps): UseProviderStateResult => {
  // Default to the first item if available
  const [activeExampleIndex, setActiveExampleIndex] = useState(0);
  const { defaultValues, examples } = useExampleRHFInterface();
  const { setValue, getValues } = useFormContext();

  const formValues = useWatch();

  const activeExample = useMemo(
    () => examples[activeExampleIndex],
    [activeExampleIndex, examples],
  );

  /** Switches to the previous example */
  const activatePrevExample = useCallback(() => {
    setActiveExampleIndex((currentIndex) => {
      const nextIndex = (currentIndex - 1) % examples.length;
      return nextIndex < 0 ? examples.length - 1 : nextIndex;
    });
  }, [examples]);

  /** Switches to the next example */
  const activateNextExample = useCallback(() => {
    setActiveExampleIndex((currentIndex) => {
      const nextIndex = (currentIndex + 1) % examples.length;
      return nextIndex < 0 ? examples.length - 1 : nextIndex;
    });
  }, [examples]);

  /** The output values for the active example */
  const output: Output = useMemo(
    () =>
      outputFormats.reduce((acc, format: ExampleOutputFormat) => {
        acc[format] = Object.fromEntries(
          activeExample.fields
            .filter(
              (field) =>
                !field.disabledOutputFormats?.[format] &&
                field[ORIGINAL_VAR_NAME_KEY],
            )
            .map((field) => {
              const { [ORIGINAL_VAR_NAME_KEY]: name, transformer } = field;
              const rawVal = formValues[activeExample.name]?.[name as string];
              const val = transformer ? transformer(rawVal) : rawVal;
              return [name, val];
            }),
        );
        return acc;
      }, {} as Output),
    [outputFormats, activeExample, formValues],
  );

  /** Copy the output values to the clipboard */
  const copyOutput = useCallback(
    (format: ExampleOutputFormat) => {
      if (typeof window === "undefined" || !output[format]) return;
      navigator.clipboard.writeText(
        Object.entries(output[format])
          .map((d) => `${d[0]}: ${d[1]};`)
          .join("\n"),
      );
    },
    [output],
  );

  /** The settings for the active example */
  const activeExampleFormValues = useMemo(
    () => formValues[activeExample.name],
    [formValues, activeExample],
  );

  useEffect(() => {
    // When the active example changes, set the form values to the new example's values
    for (const field of activeExample.fields) {
      const { name: formStateKey, [ORIGINAL_VAR_NAME_KEY]: originalFieldName } =
        field;
      const curVal = getValues(formStateKey);
      let setValTo = curVal;
      // Fallback to default value if value is being cleared
      if ((setValTo === undefined || setValTo === null) && originalFieldName) {
        setValTo = defaultValues[activeExample.name]?.[originalFieldName];
      }
      if (curVal !== setValTo) {
        setValue(formStateKey, setValTo);
      }
    }
  }, [activeExample, defaultValues, setValue, getValues]);

  return useMemo(
    () => ({
      activeExampleIndex,
      setActiveExampleIndex,
      activeExample,
      allExamples: examples,
      copyOutput,
      activatePrevExample,
      activateNextExample,
      output,
      activeExampleFormValues,
    }),
    [
      activeExampleIndex,
      activeExample,
      examples,
      copyOutput,
      activatePrevExample,
      activateNextExample,
      output,
      activeExampleFormValues,
    ],
  );
};

export default useProviderState;
