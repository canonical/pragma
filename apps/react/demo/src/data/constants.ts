import type { FieldElementScopeName } from "../ui/index.js";

/** Name of the `ExampleControlField.name` before it was transformed to a RHF key. */
export const ORIGINAL_VAR_NAME_KEY = "data-original-var-name";

export const SUPPORTED_ELEMENT_SCOPES: FieldElementScopeName[] = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "hr",
];
