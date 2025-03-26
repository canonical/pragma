import { type ReactElement, useMemo } from "react";
import type { ControlProps } from "./types.js";

const Control = ({ control, onChange }: ControlProps): ReactElement => {
  const inputElement = useMemo(() => {
    switch (control.type) {
      // TODO consume the form package in a follow-up, these native elements are temporary
      case "number":
        return (
          <>
            <input
              type="range"
              id="fontSizeRange"
              name={control.name}
              min={control.min}
              max={control.max}
              value={control.value}
              step={control.step}
              onChange={onChange}
              aria-label="Font Size"
              aria-valuemin={control.min}
              aria-valuemax={control.max}
              aria-valuenow={control.value}
              aria-valuetext={`${control.name}: ${control.value}`}
              style={{ flexGrow: 1 }}
            />
            <span style={{ marginLeft: "8px", whiteSpace: "nowrap" }}>
              {control.value}
            </span>
          </>
        );
      case "choices":
        return (
          <select id={control.name} value={control.value} onChange={onChange}>
            {control.choices.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        );
    }
  }, [control, onChange]);

  return (
    <>
      <label
        htmlFor={control.name}
        style={{ display: "block", marginBottom: "4px" }}
      >
        {control.label}
      </label>
      {inputElement}
    </>
  );
};

export default Control;
