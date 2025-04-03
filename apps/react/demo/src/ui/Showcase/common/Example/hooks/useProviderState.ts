import { ORIGINAL_VAR_NAME_KEY } from "data/index.js";
import { useExampleRHFInterface } from "hooks/index.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { toGlobalFormStateKey } from "../../../../../utils/index.js";
import type { ExampleOutputFormat, Output } from "../types.js";
import type { UseProviderStateProps, UseProviderStateResult } from "./types.js";

/**
 * Hook to manage the state of the provider
 */
const useProviderState = ({
  outputFormats = ["css"],
  queryParams = {},
}: UseProviderStateProps): UseProviderStateResult => {
  const { defaultValues, examples } = useExampleRHFInterface();
  const { setValue, getValues } = useFormContext();

  /** The initial example index is determined by the query params - or 0 if none is given. */
  const initialExampleIndex = useMemo(() => {
    // TODO store `example` key as a constant
    const { exampleId } = queryParams;
    if (!exampleId) return 0;

    const exampleIndex = examples.findIndex(
      (example) => example.id === exampleId,
    );
    return Math.max(0, exampleIndex);
  }, [examples, queryParams]);

  const [activeExampleIndex, setActiveExampleIndex] =
    useState(initialExampleIndex);

  const formValues = useWatch();

  const activeExample = useMemo(
    () => examples[activeExampleIndex],
    [activeExampleIndex, examples],
  );

  // Bind `settingValues` query params to the form state
  useEffect(() => {
    const { settingValues, exampleId } = queryParams;
    if (!settingValues || exampleId !== activeExample?.id) return;
    for (const settingName in settingValues) {
      const key = toGlobalFormStateKey(activeExample.id, settingName);
      const val = settingValues[settingName];
      if (
        val === undefined ||
        val === null ||
        !settingName ||
        !(settingName in activeExampleFormValues) ||
        !key
      ) {
        console.warn(`Discarding query param ${settingName} with value ${val}`);
      }
      // TODO this doesn't yet validate that `val` is a valid value for the field
      setValue(key, val, {
        shouldValidate: true,
        shouldTouch: true,
        shouldDirty: true,
      });
    }
  }, [queryParams, setValue, activeExample]);

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
              const rawVal = formValues[activeExample.id]?.[name as string];
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
    () => formValues[activeExample.id],
    [formValues, activeExample],
  );

  useEffect(() => {
    // When the active example changes, set the form values to the new example's values
    for (const field of activeExample.fields) {
      const { id: formStateKey, [ORIGINAL_VAR_NAME_KEY]: originalFieldName } =
        field;
      const curVal = getValues(formStateKey);
      let setValTo = curVal;
      // Fallback to default value if value is being cleared
      if ((setValTo === undefined || setValTo === null) && originalFieldName) {
        setValTo = defaultValues[activeExample.id]?.[originalFieldName];
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
