/* @canonical/generator-ds 0.10.0-experimental.3 */

import type { HTMLSelectAttributes } from "svelte/elements";
import type { ModifierFamilyValues } from "../../modifier-families/index.js";

export interface SelectProps extends HTMLSelectAttributes {
  ref?: HTMLSelectElement;
  density?: Extract<ModifierFamilyValues["density"], "dense" | "medium">;
  severity?: ModifierFamilyValues["severity"] | "base";
}
