import { ORIGINAL_VAR_NAME_KEY } from "data/index.js";
import { useGlobalForm } from "hooks/index.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
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
  const { defaultValues, examples } = useGlobalForm();
  const { setValue, getValues, watch } = useFormContext();

  useEffect(() => {
    // Currently, changes to simple-changes and select fields don't cause re-renders unless we do this.
    watch();
  }, [watch]);

  const activeExample = useMemo(
    () => examples[activeExampleIndex],
    [activeExampleIndex, examples],
  );

  const handlePrevExample = useCallback(() => {
    setActiveExampleIndex((currentIndex) => {
      const nextIndex = (currentIndex - 1) % examples.length;
      return nextIndex < 0 ? examples.length - 1 : nextIndex;
    });
  }, [examples]);

  const handleNextExample = useCallback(() => {
    setActiveExampleIndex((currentIndex) => {
      const nextIndex = (currentIndex + 1) % examples.length;
      return nextIndex < 0 ? examples.length - 1 : nextIndex;
    });
  }, [examples]);

  const output: Output = useMemo(
    () =>
      outputFormats.reduce((acc, format: ExampleOutputFormat) => {
        acc[format] = Object.fromEntries(
          activeExample.controls
            .filter((control) => !control.disabledOutputFormats?.[format])
            .map((control) => {
              const {
                [ORIGINAL_VAR_NAME_KEY]: name,
                name: formStateKey,
                transformer,
              } = control;
              const rawVal = getValues(formStateKey);
              const val = transformer ? transformer(rawVal) : rawVal;
              return [name, val];
            }),
        );
        return acc;
      }, {} as Output),
    [outputFormats, activeExample, getValues],
  );

  const handleCopyOutput = useCallback(
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

  useEffect(() => {
    // When the active example changes, set the form values to the new example's values
    for (const control of activeExample.controls) {
      const { name: formStateKey } = control;
      const curVal = getValues(formStateKey);
      const setValTo =
        curVal !== undefined ? curVal : defaultValues[formStateKey];
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
      handleCopyOutput,
      handlePrevExample,
      handleNextExample,
      output,
    }),
    [
      activeExampleIndex,
      activeExample,
      examples,
      output,
      handleCopyOutput,
      handlePrevExample,
      handleNextExample,
    ],
  );
};

export default useProviderState;
