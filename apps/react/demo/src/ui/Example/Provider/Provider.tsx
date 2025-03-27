import React, { type FC, useState, useMemo, useEffect, act } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import Context from "../Context.js";
import type { ProviderProps, ProviderValue } from "./types.js";

const Provider: FC<ProviderProps> = ({ items = [], children }) => {
  // Default to the first item if available
  const [activeExampleIndex, setActiveExampleIndex] = useState(0);

  const { setValue } = useFormContext();
  const formState = useWatch();

  const activeExample = useMemo(
    () => items[activeExampleIndex],
    [activeExampleIndex, items],
  );

  const css = useMemo(
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
      css,
    }),
    [css],
  );

  useEffect(() => {
    // When the active example changes, set the form values to the new example's values
    for (const control of activeExample.controls) {
      setValue(control.name, control.value || control.default);
    }
  }, [activeExample, setValue]);

  useEffect(() => {
    // When form state changes, synchronize the form state values with the example control's values.
    // This allows the form's state to be recovered when switching between examples.
    for (const control of activeExample.controls) {
      control.value = formState[control.name];
    }
  }, [formState, activeExample]);

  const value: ProviderValue = useMemo(
    () => ({
      activeExampleIndex,
      setActiveExampleIndex,
      activeExample,
      allExamples: items,
      output,
    }),
    [activeExampleIndex, activeExample, items, output],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export default Provider;
