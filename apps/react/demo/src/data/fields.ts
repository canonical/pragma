/**
 * Global field settings for commonly-used fields.
 *
 * Declared with `satisfies` (not a type annotation) so each const keeps its
 * narrow `inputType` variant: `ExampleControlField` embeds the `FieldProps`
 * discriminated union, and a widened const could no longer be spread with
 * per-example overrides (e.g. a different `defaultValue`).
 */

import type { ExampleControlField } from "../ui/index.js";
import * as transformers from "./transformers.js";

export const FONT_FAMILY_FIELD = {
  name: "--font-family",
  label: "Font family",
  inputType: "select",
  defaultValue: "Arial",
  options: [
    { value: "Arial", label: "Arial" },
    { value: "Times New Roman", label: "Times New Roman" },
    { value: "Ubuntu variable", label: "Ubuntu" },
  ],
} satisfies ExampleControlField;

export const FONT_SIZE_FIELD = {
  name: "--font-size",
  inputType: "range",
  label: "Root font size",
  defaultValue: 16,
  min: 12,
  max: 24,
  step: 1,
  transformer: transformers.convertToPixels,
} satisfies ExampleControlField;

/**
 * A field for the baseline height.
 * This is hidden and held constant to simplify the other settings, as many things currently depend on the baseline height.
 * By including it in the form, it will be included in the exported CSS, and usable as part of `calc()` expressions in exports.
 */
export const BASELINE_HEIGHT_FIELD = {
  name: "--baseline-height",
  inputType: "hidden",
  label: "Baseline height",
  defaultValue: 0.5,
  min: 0.5,
  max: 2,
  step: 0.25,
  transformer: transformers.convertToRems,
} satisfies ExampleControlField;

export const LINE_HEIGHT_FIELD = {
  name: "--line-height",
  inputType: "hidden",
  label: "Root line height",
  defaultValue: 1.5,
  min: 1,
  max: 12,
  step: 0.25,
} satisfies ExampleControlField;
