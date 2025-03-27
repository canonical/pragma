import type { ReactElement } from "react";
import type { ControlsProps } from "./types.js";
import "./styles.css";
import { Button, TooltipArea } from "@canonical/react-ds-core";
import { Field } from "@canonical/react-ds-core-form";
import { useConfig } from "../../hooks/index.js";
import { useExampleControls } from "./useExampleControls/index.js";

const componentCssClassname = "ds example-controls";

const Controls = ({ id, className, style }: ControlsProps): ReactElement => {
  const { handlePrevExample, handleNextExample, handleCopyCss } =
    useExampleControls();
  const { activeExample, output } = useConfig();

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
          <form className="inputs">
            {activeExample.controls.map(
              ({ value, transformer, disabledOutputFormats, ...control }) => (
                <Field key={control.name} {...control} />
              ),
            )}
          </form>
        }
      >
        <Button label="Configure" />
      </TooltipArea>
      <Button
        label="Copy"
        style={{ marginLeft: "auto" }}
        disabled={!output?.css}
        onClick={handleCopyCss}
      />
    </div>
  );
};

export default Controls;
