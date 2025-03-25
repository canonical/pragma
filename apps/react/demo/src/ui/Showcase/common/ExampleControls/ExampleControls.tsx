import { type ChangeEvent, type ReactElement, useCallback } from "react";
import type { ExampleControlsProps } from "./types.js";
import "./styles.css";
import { Button, TooltipArea } from "@canonical/react-ds-core";
import { useConfig } from "./Context.js";

const ExampleControls = ({
  id,
  className,
  style,
}: ExampleControlsProps): ReactElement => {
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

  return (
    <div
      id={id}
      className={["ds", "example-controls", className]
        .filter(Boolean)
        .join(" ")}
      style={{
        ...style,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <div>
        {/*TODO use icon buttons when icon is implemented*/}
        <Button label={"Prev"} onClick={handlePrevExample} />
        <Button label="Next" onClick={handleNextExample} />
      </div>
      <TooltipArea
        // TODO use new form components when ready
        // TODO make something that can convert example controls into form inputs without having to specifically handle each case
        preferredDirections={["top"]}
        targetElementClassName={"ds example-controls__config-button"}
        activateDelay={0}
        autoFit={true}
        Message={
          <div className={"ds example-controls__inputs"}>
            {activeExample?.settings?.fontFamily && (
              <div style={{ marginBottom: "8px" }}>
                <label
                  htmlFor="fontFamilySelect"
                  style={{ display: "block", marginBottom: "4px" }}
                >
                  Font Family:
                </label>
                <select
                  id="fontFamilySelect"
                  value={activeExample.settings.fontFamily.value}
                  onChange={handleFontFamilyChange}
                  style={{ width: "100%" }}
                >
                  {activeExample.settings.fontFamily.choices.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {activeExample?.settings?.fontSize && (
              <div>
                <label
                  htmlFor="fontSizeRange"
                  style={{ display: "block", marginBottom: "0.25rem" }}
                >
                  Font Size:
                </label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="range"
                    id="fontSizeRange"
                    min={activeExample.settings.fontSize.min}
                    max={activeExample.settings.fontSize.max}
                    // The value is stored in px, so we need to convert it to a number
                    value={Number.parseInt(
                      // @ts-ignore This is a string, but more concrete input handling will be added in a followup PR
                      activeExample.settings.fontSize.value,
                    )}
                    step={activeExample.settings.fontSize.step}
                    onChange={handleFontSizeChange}
                    aria-label="Font Size"
                    aria-valuemin={activeExample.settings.fontSize.min}
                    aria-valuemax={activeExample.settings.fontSize.max}
                    aria-valuenow={activeExample.settings.fontSize.value}
                    aria-valuetext={`${activeExample.settings.fontSize.value} pixels`}
                    style={{ flexGrow: 1 }}
                  />
                  <span style={{ marginLeft: "8px", whiteSpace: "nowrap" }}>
                    {Number.parseInt(
                      // @ts-ignore This is a string, but more concrete input handling will be added in a followup PR
                      activeExample.settings.fontSize.value,
                    )}
                    px
                  </span>
                </div>
              </div>
            )}
            {activeExample?.settings?.lineHeight && (
              <div>
                <label
                  htmlFor="lineHeightRange"
                  style={{ display: "block", marginBottom: "0.25rem" }}
                >
                  Line Height:
                </label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="range"
                    id="lineHeightRange"
                    min={activeExample.settings.lineHeight.min}
                    max={activeExample.settings.lineHeight.max}
                    value={activeExample.settings.lineHeight.value}
                    step={activeExample.settings.lineHeight.step}
                    onChange={(event) => {
                      if (activeExampleName) {
                        dispatch({
                          type: "UPDATE_SETTING",
                          exampleName: activeExampleName,
                          settingName: "lineHeight",
                          // @ts-ignore This is a string, but more concrete input handling will be added in a followup PR
                          newValue: Number.parseFloat(event.target.value),
                        });
                      }
                    }}
                    aria-label="Line Height"
                    aria-valuemin={activeExample.settings.lineHeight.min}
                    aria-valuemax={activeExample.settings.lineHeight.max}
                    aria-valuenow={activeExample.settings.lineHeight.value}
                    aria-valuetext={`${activeExample.settings.lineHeight.value}`}
                    style={{ flexGrow: 1 }}
                  />
                  <span style={{ marginLeft: "8px", whiteSpace: "nowrap" }}>
                    {activeExample.settings.lineHeight.value}
                  </span>
                </div>
              </div>
            )}
          </div>
        }
      >
        <Button label="Configure" />
      </TooltipArea>
      <Button
        label="Copy"
        style={{ marginLeft: "auto" }}
        disabled={!activeExample?.cssVars}
        onClick={handleCopyCss}
      />
    </div>
  );
};

export default ExampleControls;
