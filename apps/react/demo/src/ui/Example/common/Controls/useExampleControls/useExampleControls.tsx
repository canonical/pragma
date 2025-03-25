import { type ChangeEvent, useCallback, useMemo } from "react";
import { useConfig } from "../../../hooks/index.js";
import type { UseExampleControlsResult } from "./types.js";

const useExampleControls = (): UseExampleControlsResult => {
  const {
    dispatch,
    allExamples: examples,
    activeExample,
    activeExampleName,
    setActiveExampleName,
  } = useConfig();

  const handleFontFamilyChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      if (activeExampleName) {
        dispatch({
          type: "UPDATE_SETTING",
          exampleName: activeExampleName,
          settingName: "fontFamily",
          newValue: event.target.value,
        });
      }
    },
    [activeExampleName, dispatch],
  );

  const handleFontSizeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (activeExampleName) {
        dispatch({
          type: "UPDATE_SETTING",
          exampleName: activeExampleName,
          settingName: "fontSize",
          newValue: Number.parseFloat(event.target.value),
        });
      }
    },
    [activeExampleName, dispatch],
  );

  const handleLineHeightChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (activeExampleName) {
        dispatch({
          type: "UPDATE_SETTING",
          exampleName: activeExampleName,
          settingName: "lineHeight",
          newValue: Number.parseFloat(event.target.value),
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
    if (typeof window === "undefined" || !activeExample?.cssVars) return;
    navigator.clipboard.writeText(
      Object.entries(activeExample.cssVars)
        .map((d) => `${d[0]}: ${d[1]};`)
        .join("\n"),
    );
  }, [activeExample]);

  return useMemo(
    () => ({
      handleFontFamilyChange,
      handleFontSizeChange,
      handleCopyCss,
      handlePrevExample,
      handleNextExample,
      handleLineHeightChange,
    }),
    [
      handleFontFamilyChange,
      handleFontSizeChange,
      handleCopyCss,
      handlePrevExample,
      handleNextExample,
      handleLineHeightChange,
    ],
  );
};

export default useExampleControls;
