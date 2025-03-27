import { type ChangeEvent, useCallback, useMemo } from "react";
import { useConfig } from "../../../hooks/index.js";
import type { AllExampleSettings, ExampleControl } from "../../../types.js";
import type { UseExampleControlsResult } from "./types.js";

const useExampleControls = (): UseExampleControlsResult => {
  const { allExamples: examples, output, setActiveExampleIndex } = useConfig();

  const handlePrevExample = useCallback(() => {
    setActiveExampleIndex((currentIndex) => {
      const nextIndex = (currentIndex - 1) % examples.length;
      return nextIndex < 0 ? examples.length - 1 : nextIndex;
    });
  }, [examples, setActiveExampleIndex]);

  const handleNextExample = useCallback(() => {
    setActiveExampleIndex((currentIndex) => {
      const nextIndex = (currentIndex + 1) % examples.length;
      return nextIndex < 0 ? examples.length - 1 : nextIndex;
    });
  }, [examples, setActiveExampleIndex]);

  const handleCopyCss = useCallback(() => {
    if (typeof window === "undefined" || !output.css) return;
    navigator.clipboard.writeText(
      Object.entries(output.css)
        .map((d) => `${d[0]}: ${d[1]};`)
        .join("\n"),
    );
  }, [output]);

  return useMemo(
    () => ({
      handleCopyCss,
      handlePrevExample,
      handleNextExample,
    }),
    [handleCopyCss, handlePrevExample, handleNextExample],
  );
};

export default useExampleControls;
