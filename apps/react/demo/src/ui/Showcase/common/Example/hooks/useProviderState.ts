import { ORIGINAL_VAR_NAME_KEY } from "data/index.js";
import { useExampleRHFInterface } from "hooks/index.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type {
  ExampleControlField,
  ExampleOutputFormat,
  Output,
  TransformerFnKey,
} from "../types.js";
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
  const { setValue, getValues, watch } = useFormContext();

  const formValues = useWatch();

  const activeExample = useMemo(
    () => examples[activeExampleIndex],
    [activeExampleIndex, examples],
  );

  const showBaselineGrid = watch("showBaselineGrid");

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

  /**
   * Converts the output values to a string for a given format.
   * This is useful for displaying the output values in a human-readable format or copying them to the clipboard.
   * @param output The output values to convert.
   * @param format The format to convert to.
   * @returns The output values as a string.
   */
  const outputValueToString = useCallback(
    (output: Output, format: ExampleOutputFormat) => {
      switch (format) {
        case "css":
          return Object.entries(output)
            .map((d) => `${d[0]}: ${d[1]};`)
            .join("\n");
        default:
          throw new Error(`Unsupported output format: ${format}`);
      }
    },
    [],
  );

  /**
   * A flat array of all the example fields on the currently active example.
   * This makes iterative operations on the list of fields easier, as the fields are nested inside example sections.
   * */
  const activeExampleFields = useMemo(
    () =>
      activeExample.sections.reduce((fieldsAcc, section) => {
        fieldsAcc.push(...section.fields);
        return fieldsAcc;
      }, [] as ExampleControlField[]),
    [activeExample],
  );

  /** The fields that are included in output (demo, exports) for a given format */
  const outputFields = useCallback(
    (format: ExampleOutputFormat) =>
      activeExampleFields.filter(
        (field) =>
          !field.disabledOutputFormats?.[format] &&
          field[ORIGINAL_VAR_NAME_KEY],
      ),
    [activeExampleFields],
  );

  /**
   * Extracts the values from the form state for a given set of fields.
   * @param fields The fields to extract values from.
   * @param transformerFnKeys The keys of the transformer functions to apply to the values.
   *  Transformers will be applied sequentially, and the first one defined on a given field will be applied to that field's value to produce the output.
   * @returns A mapping of field names to their output values, alphabetically sorted by field name.
   */
  const extract = useCallback(
    (
      fields: ExampleControlField[],
      transformerFnKeys: TransformerFnKey[],
    ): Output =>
      Object.fromEntries(
        fields
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((field) => {
            const { [ORIGINAL_VAR_NAME_KEY]: name } = field;
            const transformers = transformerFnKeys
              .map((key) => field[key])
              .filter(Boolean);
            const [topTransformer] = transformers;
            const rawVal = formValues[activeExample.name]?.[name as string];
            const val = topTransformer ? topTransformer(rawVal) : rawVal;
            return [name, val];
          }),
      ),
    [formValues, activeExample],
  );

  /** The output values for the active example */
  const demoOutput: Output = useMemo(
    () =>
      outputFormats.reduce((acc, format: ExampleOutputFormat) => {
        acc[format] = extract(outputFields(format), [
          "demoTransformer",
          "transformer",
        ]);
        return acc;
      }, {} as Output),
    [outputFormats, outputFields, extract],
  );

  /** Copy the output values to the clipboard */
  const copyOutput = useCallback(
    (format: ExampleOutputFormat) => {
      if (typeof window === "undefined") return;
      const output = extract(outputFields(format), ["transformer"]);
      const outputAsString = outputValueToString(output, format);
      navigator.clipboard.writeText(outputAsString);
    },
    [outputFields, extract, outputValueToString],
  );

  /** The settings for the active example */
  const activeExampleFormValues = useMemo(
    () => formValues[activeExample.name],
    [formValues, activeExample],
  );

  /** Resets the active example to its default state */
  const resetActiveExample = useCallback(() => {
    for (const field of activeExampleFields) {
      if (!field[ORIGINAL_VAR_NAME_KEY]) continue;
      setValue(
        field.name,
        defaultValues[activeExample.name][field[ORIGINAL_VAR_NAME_KEY]],
      );
    }
  }, [activeExample, activeExampleFields, defaultValues, setValue]);

  useEffect(() => {
    // When the active example changes, set the form values to the new example's values
    for (const field of activeExampleFields) {
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
  }, [activeExample, activeExampleFields, defaultValues, setValue, getValues]);

  return useMemo(
    () => ({
      activeExampleIndex,
      setActiveExampleIndex,
      activeExample,
      allExamples: examples,
      copyOutput,
      activatePrevExample,
      activateNextExample,
      demoOutput,
      activeExampleFormValues,
      resetActiveExample,
      showBaselineGrid,
    }),
    [
      activeExampleIndex,
      activeExample,
      examples,
      copyOutput,
      activatePrevExample,
      activateNextExample,
      demoOutput,
      activeExampleFormValues,
      resetActiveExample,
      showBaselineGrid,
    ],
  );
};

export default useProviderState;
