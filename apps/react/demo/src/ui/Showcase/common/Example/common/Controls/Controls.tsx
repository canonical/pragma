import type { ReactElement } from "react";
import type { ControlsProps } from "./types.js";
import "./styles.css";
import { Button, TooltipArea } from "@canonical/react-ds-core";
import { Field } from "@canonical/react-ds-core-form";
import { useConfig } from "../../hooks/index.js";

const componentCssClassname = "ds example-controls";

const Controls = ({ id, className, style }: ControlsProps): ReactElement => {
  const {
    activeExample,
    output,
    handlePrevExample,
    handleNextExample,
    handleCopyOutput,
  } = useConfig();

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
        <Button label={"Prev"} type="button" onClick={handlePrevExample} />
        <Button label="Next" type="button" onClick={handleNextExample} />
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
            {activeExample.fields.map(
              ({
                name,
                defaultValue,
                transformer,
                disabledOutputFormats,
                ...fieldProps
              }) => (
                <Field
                  name={name}
                  key={name}
                  unregisterOnUnmount={false}
                  {...fieldProps}
                />
              ),
            )}
          </div>
        }
      >
        <Button label="Configure" />
      </TooltipArea>
      <Button
        type="button"
        label="Copy"
        style={{ marginLeft: "auto" }}
        disabled={!output?.css}
        onClick={() => handleCopyOutput("css")}
      />
    </div>
  );
};

export default Controls;
