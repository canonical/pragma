import type { Meta, StoryObj } from "@storybook/react-vite";
import type React from "react";
import * as decorators from "storybook/decorators.js";
import { CheckboxInput } from "../lib/subcomponent/CheckboxInput/index.js";
import { RadioInput } from "../lib/subcomponent/RadioInput/index.js";
import { SwitchInput } from "../lib/subcomponent/SwitchInput/index.js";

/**
 * Surface stepping for form controls. The checkbox/radio/switch fills, dots,
 * knobs and checkmarks read their `--surface-color-foreground-*` tokens, so a
 * control placed inside a `.surface` context recolours per nesting level
 * (`.surface` → `.surface .surface` → `.surface .surface .surface`) instead of
 * painting one flat colour on every background.
 *
 * These are presentational subcomponents (no react-hook-form), rendered once per
 * surface level via the shared `surfaces()` helper.
 */
const meta = {
  title: "Documentation/Surfaces/Examples",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * One selected + one unselected of each control, laid out in a row. `disabled`
 * renders the disabled variant of the same set (its own tokens step per surface
 * too), tagged so the two rows read distinctly.
 */
const ControlRow = ({
  level,
  disabled = false,
}: {
  level: number;
  disabled?: boolean;
}): React.ReactElement => {
  const key = `s${level}${disabled ? "-dis" : ""}`;
  return (
    <div
      style={{ display: "flex", gap: "var(--space-300)", alignItems: "center" }}
    >
      <CheckboxInput name={`${key}-cb-on`} defaultChecked disabled={disabled} />
      <CheckboxInput name={`${key}-cb-off`} disabled={disabled} />
      <RadioInput name={`${key}-radio`} defaultChecked disabled={disabled} />
      <RadioInput name={`${key}-radio`} disabled={disabled} />
      <SwitchInput
        name={`${key}-switch-on`}
        defaultChecked
        disabled={disabled}
      />
      <SwitchInput name={`${key}-switch-off`} disabled={disabled} />
      <span
        className="p"
        style={{
          color: "var(--surface-color-foreground-text, var(--color-text))",
        }}
      >
        Surface level {level + 1}
        {disabled ? " (disabled)" : ""}
      </span>
    </div>
  );
};

/**
 * Every control at each of the three surface levels — an enabled row and a
 * disabled row per level. Selected fills, knobs and dots step with the band;
 * hovering a selected control shifts only the fill (via the hover-selected
 * channels), never the masked glyph or the knob.
 */
export const Controls: Story = {
  render: () =>
    decorators.surfaces((level) => (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-200)",
        }}
      >
        <ControlRow level={level} />
        <ControlRow level={level} disabled />
      </div>
    )),
};

/**
 * Just the checkbox, to isolate the selected-fill + checkmark stepping —
 * enabled row and disabled row.
 */
export const Checkbox: Story = {
  render: () =>
    decorators.surfaces((level) => (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-200)",
        }}
      >
        <div style={{ display: "flex", gap: "var(--space-200)" }}>
          <CheckboxInput name={`cb${level}-on`} defaultChecked />
          <CheckboxInput
            name={`cb${level}-ind`}
            ref={(el) => {
              if (el) el.indeterminate = true;
            }}
          />
          <CheckboxInput name={`cb${level}-off`} />
        </div>
        <div style={{ display: "flex", gap: "var(--space-200)" }}>
          <CheckboxInput name={`cb${level}-dis-on`} defaultChecked disabled />
          <CheckboxInput
            name={`cb${level}-dis-ind`}
            disabled
            ref={(el) => {
              if (el) el.indeterminate = true;
            }}
          />
          <CheckboxInput name={`cb${level}-dis-off`} disabled />
        </div>
      </div>
    )),
};

/**
 * Just the switch, to isolate the track (selected/unselected) vs knob stepping —
 * enabled row and disabled row.
 */
export const Switch: Story = {
  render: () =>
    decorators.surfaces((level) => (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-200)",
        }}
      >
        <div style={{ display: "flex", gap: "var(--space-200)" }}>
          <SwitchInput name={`sw${level}-on`} defaultChecked />
          <SwitchInput name={`sw${level}-off`} />
        </div>
        <div style={{ display: "flex", gap: "var(--space-200)" }}>
          <SwitchInput name={`sw${level}-dis-on`} defaultChecked disabled />
          <SwitchInput name={`sw${level}-dis-off`} disabled />
        </div>
      </div>
    )),
};
