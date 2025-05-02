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
    demoOutput,
    activatePrevExample,
    activateNextExample,
    copyOutput,
    resetActiveExample,
    showBaselineGrid,
    toggleShowBaselineGrid,
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
      style={style}
    >
      <div>
        {/*TODO use icon buttons when icon is implemented*/}
        <Button
          type="button"
          onClick={activatePrevExample}
          aria-label="Open previous example"
        >
          Prev
        </Button>
        <Button
          type="button"
          onClick={activateNextExample}
          aria-label="Open next example"
        >
          Next
        </Button>
      </div>

      {/*
        TODO we need a way to invert color themes once we implement theming
      */}
      <h4 id="active-example-name">{activeExample.name}</h4>

      <Drawer
        id="showcase-settings-drawer"
        title={`${activeExample.name} settings`}
        isOpenOverride={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      >
        <Button
          type={"button"}
          onClick={resetActiveExample}
          aria-label="Reset this example's settings to their default values"
        >
          Reset to defaults
        </Button>

        {activeExample.sections.map((section) => (
          <section className="setting-category" key={section.title}>
            <h4>{section.title}</h4>
            <div className="fields">
              {section.fields.map(
                ({
                  name,
                  defaultValue,
                  demoTransformer,
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
        <Button
          type="button"
          onClick={toggleShowBaselineGrid}
          aria-label={`Set baseline visibility to ${!showBaselineGrid}`}
        >
          {showBaselineGrid ? "Hide" : "Show"} baseline
        </Button>
        <Button
          type="button"
          onClick={toggleSettingsOpen}
          aria-label={`Set settings visibility to ${!settingsOpen}`}
        >
          {settingsOpen ? "Close" : "Open"} settings
        </Button>
        {/* TODO this should probably create a toast or notification that the CSS was copied successfully. */}
        <Button
          type="button"
          disabled={!demoOutput?.css}
          aria-label="Copy the current CSS variables to the clipboard"
          onClick={() => copyOutput("css")}
        >
          Copy CSS
        </Button>
      </div>
    </div>
  );
};

export default Controls;
