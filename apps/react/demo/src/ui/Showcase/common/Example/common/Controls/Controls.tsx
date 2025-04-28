import { useCallback, useState } from "react";
import type { ReactElement } from "react";
import type { ControlsProps } from "./types.js";
import "./styles.css";
import { Button } from "@canonical/react-ds-core";
import { Field } from "@canonical/react-ds-core-form";
import { Drawer } from "ui/Drawer/index.js";
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

  const [settingsOpen, setSettingsOpen] = useState(false);
  const toggleSettingsOpen = useCallback(
    () => setSettingsOpen((settingsOpen) => !settingsOpen),
    [],
  );

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

      <Drawer
        id="showcase-settings-drawer"
        title={`${activeExample.name} settings`}
        isOpenOverride={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      >
        <Button type={"button"} onClick={resetActiveExample}>
          Reset to defaults
        </Button>

        {activeExample.sections.map((section) => (
          <section className="setting-category" key={section.title}>
            <h4>{section.title}</h4>
            <div className="inputs">
              {section.fields.map(
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
          </section>
        ))}
      </Drawer>
      <div className="end">
        <Button type="button" onClick={toggleSettingsOpen}>
          Settings
        </Button>
        <Button
          type="button"
          disabled={!output?.css}
          onClick={() => copyOutput("css")}
        >
          Copy CSS
        </Button>
      </div>
    </div>
  );
};

export default Controls;
