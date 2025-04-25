import type { ReactElement } from "react";
import type { ControlsProps } from "./types.js";
import "./styles.css";
import { Button, TooltipArea } from "@canonical/react-ds-core";
import { Field } from "@canonical/react-ds-core-form";
import { useShowcaseContext } from "../../hooks/index.js";

const componentCssClassname = "ds example-controls";

const Controls = ({ id, className, style }: ControlsProps): ReactElement => {
  const {
    activeExample,
    output,
    activatePrevExample,
    activateNextExample,
    copyOutput,
    resetActiveExample,
  } = useShowcaseContext();

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
        <Button type="button" onClick={activatePrevExample}>
          Prev
        </Button>
        <Button type="button" onClick={activateNextExample}>
          Next
        </Button>
      </div>
      <TooltipArea
        // TODO use new form components when ready
        // TODO make something that can convert example controls into form inputs without having to specifically handle each case
        preferredDirections={["top"]}
        targetElementClassName={"config-button"}
        activateDelay={0}
        autoFit={true}
        Message={
          <>
            <h4>Example settings</h4>
            <Button type={"button"} onClick={resetActiveExample}>
              Reset to defaults
            </Button>
            <hr />
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
          </>
        }
      >
        <Button>Configure</Button>
      </TooltipArea>
      <Button
        type="button"
        style={{ marginLeft: "auto" }}
        disabled={!output?.css}
        onClick={() => copyOutput("css")}
      >
        Copy CSS
      </Button>
    </div>
  );
};

export default Controls;
