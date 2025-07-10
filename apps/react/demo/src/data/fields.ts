/** Global field settings for commonly-used fields. */

import type { ExampleControlField } from "../ui/index.js";
import * as transformers from "./transformers.js";

export const FONT_FAMILY_FIELD: ExampleControlField = {
  name: "--font-family",
  label: "Font family",
  inputType: "select",
  defaultValue: "Arial",
  options: [
    { value: "Arial", label: "Arial" },
    { value: "Times New Roman", label: "Times New Roman" },
    { value: "Ubuntu variable", label: "Ubuntu" },
  ],
};

export const FONT_SIZE_FIELD: ExampleControlField = {
  name: "--font-size",
  inputType: "range",
  label: "Root font size",
  defaultValue: 16,
  min: 12,
  max: 24,
  step: 1,
  transformer: transformers.convertToPixels,
};

/**
 * A field for the baseline height.
 * This is hidden and held constant to simplify the other settings, as many things currently depend on the baseline height.
 * By including it in the form, it will be included in the exported CSS, and usable as part of `calc()` expressions in exports.
 */
export const BASELINE_HEIGHT_FIELD: ExampleControlField = {
  name: "--baseline-height",
  inputType: "hidden",
  label: "Baseline height",
  defaultValue: 0.5,
  min: 0.5,
  max: 2,
  step: 0.25,
  transformer: transformers.convertToRems,
};

export const LINE_HEIGHT_FIELD: ExampleControlField = {
  name: "--line-height",
  inputType: "hidden",
  label: "Root line height",
  defaultValue: 1.5,
  min: 1,
  max: 12,
  step: 0.25,
};
