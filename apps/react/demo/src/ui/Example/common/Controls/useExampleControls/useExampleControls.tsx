import { type ChangeEvent, useCallback, useMemo } from "react";
import { useConfig } from "../../../hooks/index.js";
import type { AllExampleSettings, ExampleControl } from "../../../types.js";
import type { UseExampleControlsResult } from "./types.js";

const useExampleControls = (): UseExampleControlsResult => {
  const {
    dispatch,
    allExamples: examples,
    activeExample,
    activeExampleName,
    setActiveExampleName,
  } = useConfig();

  const handleControlChange = useCallback(
    (
      event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
      control: ExampleControl,
    ) => {
      if (activeExampleName) {
        dispatch({
          type: "UPDATE_SETTING",
          exampleName: activeExampleName,
          settingName: control.name,
          newValue: event.target.value,
        });
      }
    },
    [activeExampleName, dispatch],
  );

  const handlePrevExample = useCallback(() => {
    if (examples?.length) {
      const currentIndex = examples.findIndex(
        (ex) => ex.name === activeExampleName,
      );
      const prevIndex = (currentIndex - 1 + examples.length) % examples.length;
      setActiveExampleName(examples[prevIndex].name);
    }
  }, [activeExampleName, examples, setActiveExampleName]);

  const handleNextExample = useCallback(() => {
    if (examples?.length) {
      const currentIndex = examples.findIndex(
        (ex) => ex.name === activeExampleName,
      );
      const nextIndex = (currentIndex + 1) % examples.length;
      setActiveExampleName(examples[nextIndex].name);
    }
  }, [activeExampleName, examples, setActiveExampleName]);

  const handleCopyCss = useCallback(() => {
    if (typeof window === "undefined" || !activeExample?.output?.css) return;
    navigator.clipboard.writeText(
      Object.entries(activeExample.output.css)
        .map((d) => `${d[0]}: ${d[1]};`)
        .join("\n"),
    );
  }, [activeExample]);

  return useMemo(
    () => ({
      handleCopyCss,
      handlePrevExample,
      handleNextExample,
      handleControlChange,
    }),
    [handleCopyCss, handlePrevExample, handleNextExample, handleControlChange],
  );
};

export default useExampleControls;
