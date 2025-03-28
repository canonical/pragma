import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { ExampleOutputFormat, Output } from "../types.js";
import type { UseProviderStateProps, UseProviderStateResult } from "./types.js";

/**
 * Hook to manage the state of the provider
 */
const useProviderState = ({
  items = [],
  defaultValues,
  outputFormats = ["css"],
}: UseProviderStateProps): UseProviderStateResult => {
  // Default to the first item if available
  const [activeExampleIndex, setActiveExampleIndex] = useState(0);

  const { setValue } = useFormContext();
  const formState = useWatch();

  const activeExample = useMemo(
    () => items[activeExampleIndex],
    [activeExampleIndex, items],
  );

  const handlePrevExample = useCallback(() => {
    setActiveExampleIndex((currentIndex) => {
      const nextIndex = (currentIndex - 1) % items.length;
      return nextIndex < 0 ? items.length - 1 : nextIndex;
    });
  }, [items]);

  const handleNextExample = useCallback(() => {
    setActiveExampleIndex((currentIndex) => {
      const nextIndex = (currentIndex + 1) % items.length;
      return nextIndex < 0 ? items.length - 1 : nextIndex;
    });
  }, [items]);

  const output: Output = useMemo(
    () =>
      outputFormats.reduce((acc, format: ExampleOutputFormat) => {
        acc[format] = Object.fromEntries(
          activeExample.controls
            .filter(
              (control) =>
                !control.disabledOutputFormats?.[format] &&
                control.value !== undefined,
            )
            .map((control) => {
              const { name, transformer } = control;
              const rawVal = formState[name];
              const val = transformer ? transformer(rawVal) : rawVal;
              return [name, val];
            }),
        );
        return acc;
      }, {} as Output),
    [outputFormats, activeExample, formState],
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
      setValue(
        control.name,
        control.value !== undefined
          ? control.value
          : defaultValues[activeExampleIndex][control.name],
      );
    }
  }, [activeExample, setValue, defaultValues, activeExampleIndex]);

  useEffect(() => {
    // When form state changes, synchronize the form state values with the example control's values.
    // This allows the form's state to be recovered when switching between examples.
    for (const control of activeExample.controls) {
      control.value =
        formState[control.name] ||
        defaultValues[activeExampleIndex][control.name];
    }
  }, [formState, activeExample, defaultValues, activeExampleIndex]);

  return useMemo(
    () => ({
      activeExampleIndex,
      setActiveExampleIndex,
      activeExample,
      allExamples: items,
      handleCopyOutput,
      handlePrevExample,
      handleNextExample,
      output,
    }),
    [
      activeExampleIndex,
      activeExample,
      items,
      output,
      handleCopyOutput,
      handlePrevExample,
      handleNextExample,
    ],
  );
};

export default useProviderState;
