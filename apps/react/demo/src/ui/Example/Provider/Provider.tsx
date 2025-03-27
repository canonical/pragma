import React, { type FC, useState, useMemo, useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import Context from "../Context.js";
import type { ProviderProps, ProviderValue } from "./types.js";

const Provider: FC<ProviderProps> = ({ items = [], children }) => {
  // Default to the first item if available
  const [activeExampleIndex, setActiveExampleIndex] = useState(0);

  const { reset } = useFormContext();
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
    reset(
      Object.fromEntries(
        activeExample.controls.map((control) => [
          control.name,
          control.default,
        ]),
      ),
    );
  }, [activeExample, reset]);

  useEffect(() => {
    console.log({ formState, output });
  }, [formState, output]);

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
