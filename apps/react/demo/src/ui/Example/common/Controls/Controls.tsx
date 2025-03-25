import type { ReactElement } from "react";
import type { ControlsProps } from "./types.js";
import "./styles.css";
import { Button, TooltipArea } from "@canonical/react-ds-core";
import { useConfig } from "../../hooks/index.js";
import { useExampleControls } from "./useExampleControls/index.js";

const componentCssClassname = "ds example-controls";

const Controls = ({ id, className, style }: ControlsProps): ReactElement => {
  const { activeExample } = useConfig();
  const {
    handlePrevExample,
    handleNextExample,
    handleFontFamilyChange,
    handleFontSizeChange,
    handleLineHeightChange,
    handleCopyCss,
  } = useExampleControls();

  return (
    <div
      id={id}
      className={[componentCssClassname, className].filter(Boolean).join(" ")}
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
        targetElementClassName={"config-button"}
        activateDelay={0}
        autoFit={true}
        Message={
          <div className="inputs">
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
                    onChange={handleLineHeightChange}
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

export default Controls;
