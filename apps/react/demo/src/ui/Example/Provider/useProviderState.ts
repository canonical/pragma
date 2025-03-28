import { useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { UseProviderStateProps, UseProviderStateResult } from "./types.js";

/**
 * Hook to manage the state of the provider
 */
const useProviderState = ({
  items,
  defaultValues,
}: UseProviderStateProps): UseProviderStateResult => {
  // Default to the first item if available
  const [activeExampleIndex, setActiveExampleIndex] = useState(0);

  const { setValue } = useFormContext();
  const formState = useWatch();

  const activeExample = useMemo(
    () => items[activeExampleIndex],
    [activeExampleIndex, items],
  );

  const cssOutput = useMemo(
    () =>
      Object.fromEntries(
        activeExample.controls
          .filter((control) => !control.disabledOutputFormats?.css)
          .map((control) => {
            const { name, transformer } = control;
            const rawVal = formState[name];
            const val = transformer ? transformer(rawVal) : rawVal;
            return [name, val];
          }),
      ),
    [activeExample, formState],
  );

  const output = useMemo(
    () => ({
      css: cssOutput,
    }),
    [cssOutput],
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
      output,
    }),
    [activeExampleIndex, activeExample, items, output],
  );
};

export default useProviderState;
